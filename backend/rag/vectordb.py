"""
vectordb.py — ChromaDB persistent vector storage for Axion RAG.

WHY ChromaDB:
- Zero-infrastructure: runs in-process with SQLite+FAISS backend.
  No Docker, no network hop, no separate process to manage.
- Persistent by default with PersistentClient — survives restarts.
- Native metadata filtering with a MongoDB-style $where syntax.
- cosine distance metric is the correct choice for L2-normalised BGE embeddings.

Collection name: "axion_knowledge_base"
- Single collection for all subjects/chapters.
- Subject/chapter isolation is achieved through metadata filters at query time,
  not through separate collections. This lets us do cross-subject queries
  if needed in the future without schema migration.

Data model per document (ChromaDB calls them "documents"):
    id:        chunk_id  (deterministic, used for upsert deduplication)
    document:  chunk text
    embedding: float32 array (1024-dim, L2-normalised)
    metadata:  {subject, chapter, section, source, class_level, chunk_index, ...}
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

import chromadb
from chromadb import Collection
from chromadb.config import Settings

import numpy as np

logger = logging.getLogger(__name__)

COLLECTION_NAME = "axion_knowledge_base"

# Default path for persistent storage.
# In production, override via CHROMA_PERSIST_DIR env var.
DEFAULT_PERSIST_DIR = os.environ.get(
    "CHROMA_PERSIST_DIR",
    str(Path(__file__).parent.parent / "chroma_db"),
)


# ---------------------------------------------------------------------------
# Client + collection management
# ---------------------------------------------------------------------------

def get_chroma_client(persist_dir: str = DEFAULT_PERSIST_DIR) -> chromadb.PersistentClient:
    """
    Return a persistent ChromaDB client.

    WHY PersistentClient over EphemeralClient:
    - EphemeralClient loses all data on process restart — useless for production.
    - PersistentClient writes to SQLite+FAISS on disk; survives restarts.
    - The persist_dir is created automatically if it doesn't exist.
    """
    Path(persist_dir).mkdir(parents=True, exist_ok=True)
    logger.info("ChromaDB persist dir: %s", persist_dir)

    client = chromadb.PersistentClient(
        path=persist_dir,
        settings=Settings(
            anonymized_telemetry=False,  # disable telemetry pings
        ),
    )
    return client


def get_collection(
    client: chromadb.PersistentClient | None = None,
    persist_dir: str = DEFAULT_PERSIST_DIR,
) -> Collection:
    """
    Get (or create) the axion_knowledge_base collection.

    Uses get_or_create_collection so this is safe to call multiple times
    — idempotent. The collection uses cosine distance, matching our
    L2-normalised BGE embeddings where cosine ≡ dot product.

    Args:
        client:      Existing ChromaDB client. Creates one if None.
        persist_dir: Where to persist data (used only if client is None).

    Returns:
        ChromaDB Collection object ready for insert/query.
    """
    if client is None:
        client = get_chroma_client(persist_dir)

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine",    # must match how embeddings are normalised
            "description": "Axion NCERT knowledge base — all subjects and classes",
        },
    )

    logger.info(
        "Collection '%s' ready — %d documents currently stored",
        COLLECTION_NAME,
        collection.count(),
    )
    return collection


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------

def upsert_chunks(
    collection: Collection,
    chunks: list[dict],
    embeddings: np.ndarray,
) -> int:
    """
    Upsert chunks + embeddings into the collection.

    WHY upsert (not add):
    - If the same PDF is re-processed (e.g. after a re-upload), upsert
      overwrites existing entries by chunk_id instead of creating duplicates.
    - This makes the pipeline idempotent — safe to run multiple times.

    Args:
        collection: ChromaDB collection from get_collection().
        chunks:     List of chunk dicts from chunking.py
                    Each must have: text, metadata, chunk_id
        embeddings: Float32 array of shape (len(chunks), 1024)

    Returns:
        Number of chunks upserted.

    Raises:
        ValueError: If chunks and embeddings counts don't match.
    """
    if len(chunks) != len(embeddings):
        raise ValueError(
            f"chunks ({len(chunks)}) and embeddings ({len(embeddings)}) "
            "must have the same length."
        )
    if len(chunks) == 0:
        logger.warning("upsert_chunks() called with 0 chunks — nothing to do.")
        return 0

    ids        = [c["chunk_id"] for c in chunks]
    documents  = [c["text"] for c in chunks]
    metadatas  = [_sanitise_metadata(c["metadata"]) for c in chunks]
    embeddings_list = embeddings.tolist()  # ChromaDB expects Python lists

    # ChromaDB has a hard limit of 5461 items per upsert call.
    # We batch in groups of 500 to stay well within limits and
    # give clear per-batch progress logging.
    BATCH_SIZE = 500
    total_upserted = 0

    for batch_start in range(0, len(chunks), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(chunks))

        collection.upsert(
            ids=ids[batch_start:batch_end],
            documents=documents[batch_start:batch_end],
            embeddings=embeddings_list[batch_start:batch_end],
            metadatas=metadatas[batch_start:batch_end],
        )

        batch_count = batch_end - batch_start
        total_upserted += batch_count
        logger.info(
            "Upserted batch %d–%d (%d chunks)",
            batch_start, batch_end - 1, batch_count,
        )

    logger.info(
        "Total upserted: %d chunks into '%s' (collection now has %d total)",
        total_upserted, COLLECTION_NAME, collection.count(),
    )
    return total_upserted


# ---------------------------------------------------------------------------
# Read / query operations
# ---------------------------------------------------------------------------

def query_similar(
    collection: Collection,
    query_embedding: np.ndarray,
    top_k: int = 5,
    where: Optional[dict] = None,
) -> list[dict]:
    """
    Retrieve the top-k most similar chunks to a query embedding.

    Args:
        collection:      ChromaDB collection.
        query_embedding: 1D float32 array of shape (1024,) from embed_query().
        top_k:           Number of results to return.
        where:           Optional ChromaDB metadata filter dict.
                         Examples:
                           {"subject": "Physics"}
                           {"$and": [{"subject": "Physics"}, {"class_level": "12"}]}
                           {"chapter": {"$in": ["Kinematics", "Laws of Motion"]}}

    Returns:
        List of result dicts, each containing:
            id, text, metadata, distance, rank
        Sorted by ascending distance (most similar first).
    """
    if query_embedding.ndim != 1:
        raise ValueError(
            f"query_embedding must be 1D, got shape {query_embedding.shape}"
        )

    query_params: dict[str, Any] = {
        "query_embeddings": [query_embedding.tolist()],
        "n_results": top_k,
        "include": ["documents", "metadatas", "distances", "embeddings"],
    }

    # Only add 'where' if provided — ChromaDB rejects empty where dicts
    if where:
        query_params["where"] = where

    results = collection.query(**query_params)

    # ChromaDB returns lists of lists (one inner list per query).
    # We sent exactly 1 query, so take index [0] from each.
    ids        = results["ids"][0]
    documents  = results["documents"][0]
    metadatas  = results["metadatas"][0]
    distances  = results["distances"][0]

    output = []
    for rank, (doc_id, text, meta, dist) in enumerate(
        zip(ids, documents, metadatas, distances), start=1
    ):
        output.append({
            "rank":     rank,
            "id":       doc_id,
            "text":     text,
            "metadata": meta,
            "distance": round(dist, 6),   # cosine distance ∈ [0, 2]; lower = more similar
            "score":    round(1 - dist, 6),  # similarity score ∈ [-1, 1]; higher = better
        })

    return output


def delete_by_source(collection: Collection, source: str) -> int:
    """
    Delete all chunks originating from a specific source file.
    Useful when a user re-uploads a corrected version of a document.

    Args:
        collection: ChromaDB collection.
        source:     The source filename/path stored in chunk metadata.

    Returns:
        Number of chunks deleted.
    """
    # First count how many we'll delete
    existing = collection.get(where={"source": source}, include=["metadatas"])
    count = len(existing["ids"])

    if count == 0:
        logger.info("No chunks found for source='%s' — nothing to delete.", source)
        return 0

    collection.delete(where={"source": source})
    logger.info("Deleted %d chunks for source='%s'", count, source)
    return count


def get_collection_stats(collection: Collection) -> dict:
    """Return basic stats about the collection for the /debug endpoint."""
    total = collection.count()

    # Sample a few to get subject distribution
    if total == 0:
        return {"total_chunks": 0, "subjects": {}, "collection": COLLECTION_NAME}

    sample = collection.get(limit=min(total, 1000), include=["metadatas"])
    subjects: dict[str, int] = {}
    chapters: dict[str, int] = {}

    for meta in sample["metadatas"]:
        subj = meta.get("subject", "Unknown")
        chap = meta.get("chapter", "Unknown")
        subjects[subj] = subjects.get(subj, 0) + 1
        chapters[chap] = chapters.get(chap, 0) + 1

    return {
        "collection":    COLLECTION_NAME,
        "total_chunks":  total,
        "subjects":      subjects,
        "top_chapters":  dict(sorted(chapters.items(), key=lambda x: -x[1])[:10]),
    }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _sanitise_metadata(meta: dict) -> dict:
    """
    ChromaDB metadata values must be str, int, float, or bool.
    This function coerces anything else (None, list, nested dict) to str
    and drops empty-string values so they don't pollute filter queries.
    """
    sanitised: dict = {}
    for k, v in meta.items():
        if v is None:
            continue  # drop None values entirely
        if isinstance(v, (str, int, float, bool)):
            sanitised[k] = v
        else:
            sanitised[k] = str(v)
    return sanitised