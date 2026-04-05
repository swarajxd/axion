"""
rag_pipeline.py — Axion RAG ingestion and retrieval orchestrator.

This module is the single entry-point that the upload route calls after
the existing pipeline.py has classified subject/chapter.

Flow:
    classified text
        → chunk_text()          [chunking.py]
        → embed_documents()     [embedding.py]
        → upsert_chunks()       [vectordb.py]

Retrieval flow:
    query string
        → embed_query()         [embedding.py]
        → query_similar()       [vectordb.py]
        → ranked results

Design principles:
- This module owns NO business logic. It wires the other three modules together.
- All configuration is explicit — no hidden globals.
- Every public function logs its start/finish with timing so you can see
  exactly where time is spent in the uvicorn terminal.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional

import chromadb

from rag.chunking import ChunkConfig, DocumentMetadata, chunk_text
from rag.embedding import embed_documents, embed_query
from rag.vectordb import (
    get_chroma_client,
    get_collection,
    upsert_chunks,
    query_similar,
    delete_by_source,
    get_collection_stats,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared ChromaDB client — initialised once per process
# ---------------------------------------------------------------------------

_chroma_client: chromadb.PersistentClient | None = None


def _get_client() -> chromadb.PersistentClient:
    """Lazy singleton — create ChromaDB client on first use."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = get_chroma_client()
    return _chroma_client


# ---------------------------------------------------------------------------
# Public API — Ingestion
# ---------------------------------------------------------------------------

def run_pipeline(
    text: str,
    subject: str,
    chapter: str,
    source: str = "",
    class_level: str = "",
    user_id: str = "",
    section: str = "Unknown",
    chunk_config: ChunkConfig | None = None,
    replace_existing: bool = True,
) -> dict:
    """
    Full RAG ingestion pipeline: text → chunks → embeddings → ChromaDB.

    Called by the upload route AFTER pipeline.py has classified the document.
    The text passed here should already be cleaned by cleaner.py.

    Args:
        text:             Cleaned extracted text from the document.
        subject:          e.g. "Physics"
        chapter:          e.g. "Current Electricity"
        source:           Original filename, used as a deduplication key.
        class_level:      "11" or "12"
        user_id:          Clerk user ID for per-user isolation.
        section:          Top-level section within chapter (if known).
        chunk_config:     Override default chunking parameters.
        replace_existing: If True, delete existing chunks for this source
                          before inserting (idempotent re-upload support).

    Returns:
        Dict with ingestion stats:
            chunks_created, chunks_upserted, collection_total, timing_seconds
    """
    t_start = time.perf_counter()
    logger.info("━━━ RAG pipeline start: %s / %s (source=%s)", subject, chapter, source)

    collection = get_collection(client=_get_client())

    # ── Step 0: Delete existing chunks for this source ────────────────────
    if replace_existing and source:
        deleted = delete_by_source(collection, source)
        if deleted:
            logger.info("Replaced %d existing chunks for source='%s'", deleted, source)

    # ── Step 1: Chunk ──────────────────────────────────────────────────────
    logger.info("▶ Stage 1/3 — Chunking")
    t1 = time.perf_counter()

    meta = DocumentMetadata(
        subject=subject,
        chapter=chapter,
        section=section,
        source=source,
        class_level=class_level,
        user_id=user_id,
    )
    chunks = chunk_text(text, meta, config=chunk_config)
    logger.info("✓ Stage 1 — %d chunks in %.2fs", len(chunks), time.perf_counter() - t1)

    if not chunks:
        return _ingestion_error("Chunking produced 0 chunks — text may be too short.")

    # ── Step 2: Embed ──────────────────────────────────────────────────────
    logger.info("▶ Stage 2/3 — Embedding (%d chunks)", len(chunks))
    t2 = time.perf_counter()

    texts_to_embed = [c["text"] for c in chunks]
    embeddings = embed_documents(texts_to_embed)
    logger.info("✓ Stage 2 — embedded in %.2fs, shape=%s", time.perf_counter() - t2, embeddings.shape)

    # ── Step 3: Upsert to ChromaDB ─────────────────────────────────────────
    logger.info("▶ Stage 3/3 — Upserting to ChromaDB")
    t3 = time.perf_counter()

    upserted = upsert_chunks(collection, chunks, embeddings)
    logger.info("✓ Stage 3 — upserted in %.2fs", time.perf_counter() - t3)

    total_elapsed = time.perf_counter() - t_start
    logger.info("━━━ RAG pipeline complete in %.2fs", total_elapsed)

    return {
        "chunks_created":   len(chunks),
        "chunks_upserted":  upserted,
        "collection_total": collection.count(),
        "timing_seconds":   round(total_elapsed, 3),
        "subject":          subject,
        "chapter":          chapter,
        "source":           source,
    }


# ---------------------------------------------------------------------------
# Public API — Retrieval
# ---------------------------------------------------------------------------

def search(
    query: str,
    top_k: int = 5,
    subject: Optional[str] = None,
    chapter: Optional[str] = None,
    class_level: Optional[str] = None,
    user_id: Optional[str] = None,
) -> list[dict]:
    """
    Search the knowledge base for chunks most relevant to a query.

    Applies metadata filters so results are scoped to the caller's context.
    All filter arguments are optional — omit them for cross-subject search.

    Args:
        query:       Natural language question or keyword string.
        top_k:       Number of results to return.
        subject:     Filter by subject (e.g. "Physics").
        chapter:     Filter by chapter (e.g. "Kinematics").
        class_level: Filter by class ("11" or "12").
        user_id:     Filter by user (for multi-tenant isolation).

    Returns:
        List of result dicts (rank, id, text, metadata, distance, score).

    Example:
        results = search(
            "What is the work-energy theorem?",
            top_k=5,
            subject="Physics",
            class_level="11",
        )
        for r in results:
            print(r["rank"], r["score"], r["text"][:100])
    """
    if not query.strip():
        raise ValueError("search() received an empty query.")

    # Build metadata filter — only include fields that were provided
    filters = _build_where_filter(
        subject=subject,
        chapter=chapter,
        class_level=class_level,
        user_id=user_id,
    )

    # Embed the query with the BGE instruction prefix
    query_emb = embed_query(query)

    collection = get_collection(client=_get_client())
    results = query_similar(collection, query_emb, top_k=top_k, where=filters)

    logger.info(
        "Search '%s' → %d results (filters=%s)",
        query[:60], len(results), filters,
    )
    return results


def get_stats() -> dict:
    """Return collection stats for the /debug endpoint."""
    collection = get_collection(client=_get_client())
    return get_collection_stats(collection)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _build_where_filter(**kwargs) -> Optional[dict]:
    """
    Build a ChromaDB $and filter from keyword arguments.
    Only includes keys whose values are not None.

    ChromaDB requires at least one condition if 'where' is provided,
    and uses $and for multiple conditions.
    """
    conditions = [
        {k: v}
        for k, v in kwargs.items()
        if v is not None
    ]

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def _ingestion_error(msg: str) -> dict:
    logger.error("RAG ingestion error: %s", msg)
    return {
        "error":           msg,
        "chunks_created":  0,
        "chunks_upserted": 0,
        "collection_total": 0,
    }