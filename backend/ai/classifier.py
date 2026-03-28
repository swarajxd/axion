"""
classifier.py — Subject detection (LLM) + Chapter detection (embeddings).

Subject detection
-----------------
Uses the Anthropic Claude API (claude-haiku — fast and cheap) to classify
text into Physics / Chemistry / Mathematics.
Falls back to a keyword heuristic if the API call fails so the pipeline
never crashes due to a transient network error.

Chapter detection
-----------------
Uses sentence-transformer embeddings to compute cosine similarity between
the extracted text and every NCERT chapter name for the detected subject.
Returns the best match and its similarity score as the confidence value.
"""

from __future__ import annotations

import logging
import os
import re

import numpy as np

from ai.ncert_data import NCERT
from ai.embedder import embed_texts, cosine_similarity
from ai.cleaner import clean_for_llm

logger = logging.getLogger(__name__)

VALID_SUBJECTS = {"Physics", "Chemistry", "Mathematics"}

# ---------------------------------------------------------------------------
# Subject detection — LLM primary, keyword fallback
# ---------------------------------------------------------------------------

def detect_subject(text: str) -> str:
    """
    Classify text into Physics, Chemistry, or Mathematics using Claude API.
    Falls back to keyword heuristic on API failure.

    Returns:
        Subject name or "Unknown".
    """
    sample = clean_for_llm(text, max_chars=2000)

    # Try LLM first
    try:
        subject = _llm_classify_subject(sample)
        if subject in VALID_SUBJECTS:
            logger.info("LLM classified subject as: %s", subject)
            return subject
        logger.warning("LLM returned unexpected subject: %r — using fallback", subject)
    except Exception as exc:
        logger.warning("LLM subject detection failed (%s) — using keyword fallback", exc)

    # Keyword fallback
    return _keyword_fallback_subject(text)


def _llm_classify_subject(text: str) -> str:
    """Call Claude Haiku to classify the subject."""
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = (
        "You are an expert NCERT curriculum classifier for Indian high school students (Class 11 and 12).\n\n"
        "Classify the following student notes into exactly ONE subject:\n"
        "Physics, Chemistry, or Mathematics\n\n"
        "Rules:\n"
        "- Return ONLY the subject name, nothing else.\n"
        "- If you cannot determine the subject, return: Unknown\n\n"
        f"Text:\n{text}"
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Extract just the subject word in case the model added punctuation
    for subject in VALID_SUBJECTS:
        if subject.lower() in raw.lower():
            return subject
    return raw


def _keyword_fallback_subject(text: str) -> str:
    """Simple keyword fallback used when the LLM API is unavailable."""
    text_lower = text.lower()

    scores = {
        "Physics": sum(1 for kw in [
            "force", "velocity", "acceleration", "energy", "motion", "momentum",
            "electric", "magnetic", "current", "voltage", "resistance", "wave",
            "optics", "nuclear", "photon", "capacitance", "inductance", "circuit",
            "gravitational", "oscillation", "thermodynamics", "pressure", "charge",
        ] if kw in text_lower),
        "Chemistry": sum(1 for kw in [
            "reaction", "mole", "compound", "element", "bond", "orbital",
            "acid", "base", "salt", "oxidation", "reduction", "electrolyte",
            "catalyst", "equilibrium", "enthalpy", "polymer", "hydrocarbon",
            "titration", "ionic", "covalent", "crystal", "solubility", "pH",
        ] if kw in text_lower),
        "Mathematics": sum(1 for kw in [
            "matrix", "integral", "function", "derivative", "limit", "probability",
            "determinant", "vector", "polynomial", "trigonometric", "logarithm",
            "sequence", "series", "permutation", "combination", "differential",
            "binomial", "geometry", "parabola", "ellipse", "induction",
        ] if kw in text_lower),
    }

    best = max(scores, key=lambda s: scores[s])
    return best if scores[best] >= 1 else "Unknown"


# ---------------------------------------------------------------------------
# Chapter detection — embedding cosine similarity
# ---------------------------------------------------------------------------

def detect_chapter(text: str, subject: str) -> tuple[str | None, str | None, float]:
    """
    Find the best-matching NCERT chapter using semantic embeddings.

    Args:
        text:    Cleaned extracted text.
        subject: Detected subject string.

    Returns:
        Tuple of (class_level, chapter_name, confidence_score).
        confidence_score is a cosine similarity in [0, 1].
    """
    # Build candidate list: (class, chapter_name)
    candidates: list[tuple[str, str]] = []
    for std, subjects in NCERT.items():
        if subject not in subjects:
            continue
        for chapter in subjects[subject]:
            candidates.append((std, chapter))

    if not candidates:
        logger.warning("No NCERT chapters found for subject: %s", subject)
        return None, None, 0.0

    chapter_names = [c[1] for c in candidates]

    # Embed query text (use first 1000 chars — enough signal, faster)
    query_text = clean_for_llm(text, max_chars=1000)

    try:
        query_emb   = embed_texts([query_text])[0]          # shape: (D,)
        chapter_embs = embed_texts(chapter_names)            # shape: (N, D)

        similarities = cosine_similarity(query_emb, chapter_embs)  # shape: (N,)

        best_idx   = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])
        best_class, best_chapter = candidates[best_idx]

        logger.info(
            "Chapter match: '%s' (class %s) with confidence %.3f",
            best_chapter, best_class, best_score,
        )

        # Log top 3 for debugging
        top3 = np.argsort(similarities)[::-1][:3]
        for i in top3:
            logger.debug("  %.3f — %s (Class %s)", similarities[i], candidates[i][1], candidates[i][0])

        return best_class, best_chapter, best_score

    except Exception as exc:
        logger.error("Embedding-based chapter detection failed: %s", exc)
        return None, None, 0.0