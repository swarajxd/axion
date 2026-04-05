"""
embedding.py — BAAI/bge-large-en embedding layer for Axion RAG.

WHY BGE-large-en over OpenAI/other:
- BAAI/bge-large-en consistently ranks #1-3 on the MTEB retrieval benchmark
  for English text, outperforming ada-002 on most academic benchmarks.
- Runs fully locally — no API cost, no rate limits, no data leaving the machine.
- 1024-dimensional output vs 1536 for ada-002 — smaller index, faster queries.
- BGE models are specifically trained with instruction prefixes:
  "Represent this sentence for searching relevant passages: {query}"
  This instruction prefix is ONLY applied to queries, not to document chunks.
  Skipping this on documents is the correct BGE usage per the paper.

Normalisation:
- L2-normalising embeddings means cosine similarity == dot product.
  ChromaDB's cosine distance metric works on normalised vectors,
  so we normalise here and use cosine in ChromaDB for consistency.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# BGE instruction prefix — applied ONLY to query strings, never to documents.
# This is the official BGE retrieval usage pattern.
BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

MODEL_NAME = "BAAI/bge-large-en"

# How many texts to embed in one forward pass.
# 32 is safe for 16 GB RAM with bge-large-en (1024-dim, ~1.3 GB model).
# Reduce to 16 if you see OOM errors.
DEFAULT_BATCH_SIZE = 32


# ---------------------------------------------------------------------------
# Model singleton
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """
    Load BGE model once and cache it for the process lifetime.
    lru_cache(maxsize=1) means the model is loaded on first call and
    reused on every subsequent call — no redundant disk reads.
    """
    logger.info("Loading embedding model: %s (first call only)", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info(
        "Model loaded — embedding dimension: %d",
        model.get_sentence_embedding_dimension(),
    )
    return model


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_documents(texts: list[str], batch_size: int = DEFAULT_BATCH_SIZE) -> np.ndarray:
    """
    Embed a list of document chunks.

    NO instruction prefix — this is correct BGE usage for passage/document text.
    Embeddings are L2-normalised so cosine similarity == dot product.

    Args:
        texts:      List of chunk texts to embed.
        batch_size: Forward-pass batch size. Tune based on available VRAM/RAM.

    Returns:
        Float32 numpy array of shape (len(texts), 1024), L2-normalised.
    """
    if not texts:
        raise ValueError("embed_documents() received an empty list.")

    model = _get_model()
    logger.info("Embedding %d document chunks in batches of %d", len(texts), batch_size)

    # encode() handles batching internally when batch_size is passed
    embeddings: np.ndarray = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2 normalise
        show_progress_bar=len(texts) > 50,  # show progress for large batches
    )

    logger.info("Document embeddings shape: %s", embeddings.shape)
    return embeddings.astype(np.float32)


def embed_query(query: str) -> np.ndarray:
    """
    Embed a single search query.

    Applies the BGE instruction prefix — this is mandatory for queries
    to match the retrieval training objective of bge-large-en.

    Args:
        query: Raw query string from the user.

    Returns:
        Float32 numpy array of shape (1024,), L2-normalised.
    """
    if not query or not query.strip():
        raise ValueError("embed_query() received an empty query.")

    # Prepend instruction prefix to query only
    prefixed_query = f"{BGE_QUERY_INSTRUCTION}{query.strip()}"

    model = _get_model()
    embedding: np.ndarray = model.encode(
        [prefixed_query],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embedding[0].astype(np.float32)  # shape: (1024,)


def get_embedding_dimension() -> int:
    """Return the output dimension of the loaded model (1024 for bge-large-en)."""
    return _get_model().get_sentence_embedding_dimension()