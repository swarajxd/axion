"""
embedder.py — Semantic embeddings for chapter detection.

Uses sentence-transformers locally (no API key, no cost, works offline).
Model: all-MiniLM-L6-v2 — fast, small (80 MB), excellent for
sentence-level similarity tasks like chapter matching.

The model is downloaded once on first use and cached by HuggingFace.

For RAG later: swap embed_texts() output into a vector store (Pinecone,
pgvector, Chroma) without changing the interface here.
"""

from __future__ import annotations

import logging
import numpy as np
from functools import lru_cache
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Load model once; cache for the lifetime of the process."""
    logger.info("Loading embedding model: %s", MODEL_NAME)
    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of strings.

    Args:
        texts: List of strings to embed.

    Returns:
        2D numpy array of shape (len(texts), embedding_dim).
    """
    model = _get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings  # type: ignore[return-value]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between one vector and a matrix of vectors.

    Args:
        a: 1D array (query embedding).
        b: 2D array (candidate embeddings, shape N x D).

    Returns:
        1D array of similarity scores, shape (N,).
    """
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
    return b_norm @ a_norm