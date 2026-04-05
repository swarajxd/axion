"""
chunking.py — LlamaIndex-based document chunking for Axion RAG pipeline.

WHY LlamaIndex over naive splitting:
- SentenceWindowNodeParser preserves surrounding context in metadata, so
  during retrieval we can return the original chunk PLUS its neighbouring
  sentences. This dramatically improves answer quality for dense academic text.
- Metadata (subject, chapter, section, page) is attached at chunk level so
  ChromaDB can filter by any combination without re-fetching from the source.

Design decisions:
- We parse the raw text into a LlamaIndex Document first, then node-parse it.
  This keeps the chunking logic decoupled from how text was obtained (PDF,
  OCR, markdown — doesn't matter to this module).
- Section titles are detected heuristically (short ALL-CAPS or Title-Case
  lines) and injected into each chunk's metadata so the LLM knows where in
  the document a chunk came from.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

from llama_index.core import Document
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core.schema import BaseNode

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — centralised so callers can override per-use-case
# ---------------------------------------------------------------------------

@dataclass
class ChunkConfig:
    """
    Chunking hyperparameters.

    window_size: number of sentences to include as surrounding context
                 in each node's metadata (used by MetadataReplacementPostProcessor
                 during retrieval). 3 sentences on each side is a good default
                 for NCERT-style dense prose.
    """
    window_size: int = 3          # sentences of context on each side
    original_text_metadata_key: str = "original_text"
    window_metadata_key: str = "window"


@dataclass
class DocumentMetadata:
    """
    Caller-supplied metadata that gets attached to every chunk.
    All fields end up in ChromaDB so they can be used as filters.
    """
    subject:  str
    chapter:  str
    section:  str = "Unknown"
    source:   str = ""           # filename / URL
    class_level: str = ""        # "11" or "12"
    user_id:  str = ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    metadata: DocumentMetadata,
    config: ChunkConfig | None = None,
) -> list[dict]:
    """
    Chunk raw text using LlamaIndex SentenceWindowNodeParser.

    Args:
        text:     Raw extracted text (already cleaned by cleaner.py).
        metadata: Subject/chapter/section labels for every chunk.
        config:   Chunking hyperparameters. Uses defaults if None.

    Returns:
        List of chunk dicts, each containing:
            - text:     the chunk text
            - metadata: merged dict of DocumentMetadata + LlamaIndex metadata
            - chunk_id: deterministic ID for deduplication
    """
    if not text or not text.strip():
        raise ValueError("chunk_text() received empty text — nothing to chunk.")

    cfg = config or ChunkConfig()

    # ── Step 1: Enrich text with detected section headings ─────────────────
    # We inject section titles as a special prefix inside the text so
    # SentenceWindowNodeParser carries them forward into surrounding context.
    annotated_text = _inject_section_markers(text)

    # ── Step 2: Build LlamaIndex Document ─────────────────────────────────
    # LlamaIndex Documents are the unit of input to all node parsers.
    # We store our metadata here so it propagates into every derived node.
    doc = Document(
        text=annotated_text,
        metadata={
            "subject":     metadata.subject,
            "chapter":     metadata.chapter,
            "section":     metadata.section,
            "source":      metadata.source,
            "class_level": metadata.class_level,
            "user_id":     metadata.user_id,
        },
        # Exclude heavy fields from being embedded (saves tokens)
        excluded_embed_metadata_keys=["source", "user_id"],
        excluded_llm_metadata_keys=["user_id"],
    )

    # ── Step 3: Parse into sentence-window nodes ───────────────────────────
    # SentenceWindowNodeParser splits on sentence boundaries (not token count)
    # and stores a sliding window of surrounding sentences in node metadata.
    # This is the key difference from naive chunking — we preserve local
    # context without enlarging the primary chunk text that gets embedded.
    parser = SentenceWindowNodeParser.from_defaults(
        window_size=cfg.window_size,
        window_metadata_key=cfg.window_metadata_key,
        original_text_metadata_key=cfg.original_text_metadata_key,
    )

    nodes: list[BaseNode] = parser.get_nodes_from_documents([doc])
    logger.info(
        "Chunked '%s / %s' into %d nodes (window_size=%d)",
        metadata.subject, metadata.chapter, len(nodes), cfg.window_size,
    )

    # ── Step 4: Detect per-chunk section from context ─────────────────────
    # Walk nodes in order; when we see a section marker, update current section
    # for all subsequent nodes until the next marker.
    current_section = metadata.section
    chunks: list[dict] = []

    for idx, node in enumerate(nodes):
        node_text = node.get_content()

        # Update section tracker if this chunk starts with a heading
        detected = _extract_section_title(node_text)
        if detected:
            current_section = detected

        # Build final metadata for this chunk
        chunk_meta = {
            **node.metadata,                   # LlamaIndex metadata (window etc.)
            "subject":     metadata.subject,
            "chapter":     metadata.chapter,
            "section":     current_section,
            "source":      metadata.source,
            "class_level": metadata.class_level,
            "user_id":     metadata.user_id,
            "chunk_index": idx,
            "total_chunks": len(nodes),
        }

        # Remove page_label if not set (avoids ChromaDB null issues)
        chunk_meta.pop("page_label", None)

        chunks.append({
            "text":     node_text,
            "metadata": chunk_meta,
            "chunk_id": _make_chunk_id(metadata, idx),
        })

    logger.info("Produced %d chunks for '%s'", len(chunks), metadata.chapter)
    return chunks


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

# Patterns that indicate a section heading in NCERT-style text
_HEADING_PATTERNS = [
    re.compile(r"^[A-Z][A-Z\s]{4,50}$"),              # ALL CAPS line
    re.compile(r"^\d+\.\d+[\s]+[A-Z][A-Za-z\s]{3,}"), # "1.2 Topic Name"
    re.compile(r"^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,6}$"), # Title Case Line
]


def _inject_section_markers(text: str) -> str:
    """
    Walk lines; prepend [SECTION: ...] markers before detected headings.
    These markers survive into chunk windows and help the LLM orient itself.
    """
    lines = text.splitlines()
    result: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped and _is_heading(stripped):
            result.append(f"[SECTION: {stripped}]")
        result.append(line)

    return "\n".join(result)


def _is_heading(line: str) -> bool:
    """Return True if the line looks like a section heading."""
    # Skip very short or very long lines
    if len(line) < 4 or len(line) > 80:
        return False
    # Skip lines that are clearly prose (contain punctuation mid-sentence)
    if line.count(",") > 2 or line.count(".") > 1:
        return False
    return any(p.match(line) for p in _HEADING_PATTERNS)


def _extract_section_title(text: str) -> str | None:
    """Extract the section title from a [SECTION: ...] marker if present."""
    match = re.search(r"\[SECTION:\s*(.+?)\]", text)
    return match.group(1).strip() if match else None


def _make_chunk_id(metadata: DocumentMetadata, index: int) -> str:
    """
    Deterministic chunk ID.
    Format: {subject}__{chapter}__{source_stem}__{index:04d}
    Using __ as separator since subject/chapter names contain spaces.
    """
    source_stem = metadata.source.replace(" ", "_").replace("/", "-")[:40]
    subject_slug = metadata.subject.replace(" ", "_")
    chapter_slug = metadata.chapter.replace(" ", "_").replace(",", "")[:40]
    return f"{subject_slug}__{chapter_slug}__{source_stem}__{index:04d}"