"""
pipeline.py — Orchestration layer for the VStudy ingestion pipeline.

Flow:
    file → extract_text → clean → detect_subject (LLM)
         → detect_chapter (embeddings) → structured result

All error handling is centralised here. Every code path returns
the same dict shape so the route layer never needs to branch.
"""

from __future__ import annotations

import logging
from typing import Optional

from ai.extractor import extract_text
from ai.cleaner import clean_text
from ai.classifier import detect_subject, detect_chapter

logger = logging.getLogger(__name__)

TEXT_PREVIEW_LENGTH = 1000
LOW_CONFIDENCE_THRESHOLD = 0.30  # below this, flag as low confidence


def process_file(file_path: str) -> dict:
    """
    Run the full ingestion pipeline on an uploaded file.

    Args:
        file_path: Path to the saved temporary file.

    Returns:
        Dict with keys: class, subject, chapter, confidence,
        text_preview, char_count, and optionally error / warning.
    """

    # ── 1. Extract ────────────────────────────────────────────────────────────
    try:
        raw_text = extract_text(file_path)
    except FileNotFoundError as exc:
        return _error("File not found", str(exc))
    except ValueError as exc:
        return _error("Unsupported file type", str(exc))
    except Exception as exc:
        logger.exception("Unexpected extraction error")
        return _error("Extraction failed", str(exc))

    if not raw_text or not raw_text.strip():
        return _error(
            "No text extracted",
            "The file appears to be a blank or purely graphical document. "
            "For scanned notes, ensure the image is clear and well-lit.",
        )

    # ── 2. Clean ──────────────────────────────────────────────────────────────
    text = clean_text(raw_text)

    if not text.strip():
        return _error(
            "Text unreadable after cleaning",
            "All extracted content was noise or encoding artifacts.",
            text_preview=raw_text[:TEXT_PREVIEW_LENGTH],
            char_count=len(raw_text),
        )

    # ── 3. Subject detection (LLM) ────────────────────────────────────────────
    subject = detect_subject(text)

    if subject == "Unknown":
        return {
            "error": "Could not detect subject",
            "detail": (
                "The document does not appear to contain Physics, Chemistry, "
                "or Mathematics content. Check that you uploaded the correct file."
            ),
            "class": None,
            "subject": "Unknown",
            "chapter": None,
            "confidence": 0.0,
            "text_preview": text[:TEXT_PREVIEW_LENGTH],
            "char_count": len(text),
        }

    # ── 4. Chapter detection (embeddings) ─────────────────────────────────────
    class_level, chapter, confidence = detect_chapter(text, subject)

    result: dict = {
        "class": class_level,
        "subject": subject,
        "chapter": chapter,
        "confidence": round(confidence, 4),
        "text_preview": text[:TEXT_PREVIEW_LENGTH],
        "char_count": len(text),
    }

    # Flag low-confidence matches so the UI can warn the user
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        result["warning"] = (
            f"Low confidence ({confidence:.0%}). "
            "The chapter match may be inaccurate — consider uploading a cleaner scan."
        )

    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _error(
    title: str,
    detail: str,
    text_preview: str = "",
    char_count: int = 0,
) -> dict:
    return {
        "error": title,
        "detail": detail,
        "class": None,
        "subject": None,
        "chapter": None,
        "confidence": 0.0,
        "text_preview": text_preview,
        "char_count": char_count,
    }