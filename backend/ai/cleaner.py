"""
cleaner.py — Text normalisation for VStudy ingestion pipeline.

Removes OCR/CID noise and normalises whitespace so downstream
LLM and embedding calls get clean input.
"""

from __future__ import annotations

import re


def clean_text(text: str) -> str:
    """
    Full cleaning pipeline:
      1. Strip CID encoding artifacts
      2. Remove non-printable / control characters
      3. Collapse excessive whitespace
      4. Strip leading/trailing whitespace

    Args:
        text: Raw extracted text (may contain OCR noise or CID tokens).

    Returns:
        Cleaned text string.
    """
    text = _remove_cid_tokens(text)
    text = _remove_control_chars(text)
    text = _normalize_whitespace(text)
    return text.strip()


def clean_for_llm(text: str, max_chars: int = 3000) -> str:
    """
    Clean + truncate text for LLM API calls.
    Truncates at a sentence boundary where possible.

    Args:
        text:      Raw or partially cleaned text.
        max_chars: Maximum characters to send to the LLM.

    Returns:
        Cleaned, truncated string.
    """
    cleaned = clean_text(text)
    if len(cleaned) <= max_chars:
        return cleaned

    # Try to truncate at a sentence boundary
    truncated = cleaned[:max_chars]
    last_period = truncated.rfind(".")
    if last_period > max_chars * 0.7:
        return truncated[: last_period + 1]
    return truncated


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _remove_cid_tokens(text: str) -> str:
    """Remove (cid:NNN) artifacts left by broken font maps."""
    return re.sub(r"\(cid:\d+\)", "", text)


def _remove_control_chars(text: str) -> str:
    """Strip non-printable characters except newlines and tabs."""
    return re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", " ", text)


def _normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces/tabs; preserve single newlines."""
    # Multiple spaces/tabs → single space
    text = re.sub(r"[ \t]+", " ", text)
    # More than 2 consecutive newlines → 2 newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text