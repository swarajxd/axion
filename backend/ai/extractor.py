"""
extractor.py — Robust multi-strategy text extraction.

Strategy (in order):
  1. PyMuPDF (fitz)       — fast, handles most modern PDFs natively
  2. Quality check        — detects empty output or (cid:) encoding failures
  3. Google Vision OCR    — fallback for scanned PDFs, handwritten notes, images
                            Converts PDF pages → JPEG via pdf2image, then calls
                            Vision API per page. Handles any image upload directly.

No dependency on pytesseract or Tesseract binary.
Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON.
"""

from __future__ import annotations

import io
import logging
import os
import re
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
from pdf2image import convert_from_path
from google.cloud import vision

logger = logging.getLogger(__name__)

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

# If more than this fraction of "words" are CID tokens, text is garbled
CID_THRESHOLD = 0.05


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------

def extract_text(file_path: str) -> str:
    """
    Extract clean text from a PDF or image file.

    Args:
        file_path: Path to the uploaded file.

    Returns:
        Extracted text string (may be empty if the file is truly unreadable).

    Raises:
        FileNotFoundError: File does not exist.
        ValueError: Unsupported file type.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)

    if ext in IMAGE_EXTENSIONS:
        return _google_ocr_image(file_path)

    raise ValueError(
        f"Unsupported file type '{ext}'. "
        f"Accepted: .pdf, {', '.join(sorted(IMAGE_EXTENSIONS))}"
    )


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def _extract_pdf(file_path: str) -> str:
    """
    Try PyMuPDF first. If output is empty or garbled, fall back to
    Google Vision OCR (page-by-page via pdf2image).
    """
    # Step 1: PyMuPDF — primary
    text = _extract_pdf_text_pymupdf(file_path)
    logger.info("PyMuPDF extracted %d characters", len(text))

    # Step 2: Quality gate
    if text.strip() and not _is_garbled(text):
        logger.info("PyMuPDF extraction is clean — using it")
        return text

    reason = "CID encoding detected" if text.strip() else "empty output"
    logger.warning("PyMuPDF quality check failed (%s) — falling back to Google Vision OCR", reason)

    # Step 3: Google Vision OCR fallback
    ocr_text = _google_ocr_pdf(file_path)
    logger.info("Google Vision OCR extracted %d characters", len(ocr_text))

    # Return whichever result is longer / more useful
    return ocr_text if len(ocr_text) > len(text) else text


def _extract_pdf_text_pymupdf(file_path: str) -> str:
    """Extract text from every page using PyMuPDF."""
    pages: list[str] = []
    try:
        doc = fitz.open(file_path)
        for page in doc:
            pages.append(page.get_text("text"))
        doc.close()
    except Exception as exc:
        logger.error("PyMuPDF failed: %s", exc)
    return "\n".join(pages)


def _google_ocr_pdf(file_path: str) -> str:
    """
    Convert each PDF page to a JPEG and run Google Vision OCR on it.
    Uses a temporary directory so no permanent files are left behind.

    Requires:
        - pdf2image + poppler on PATH
        - GOOGLE_APPLICATION_CREDENTIALS in environment
    """
    pages_text: list[str] = []

    try:
        images = convert_from_path(file_path, dpi=200)
        logger.info("pdf2image produced %d page image(s)", len(images))
    except Exception as exc:
        logger.error("pdf2image failed: %s", exc)
        return ""

    with tempfile.TemporaryDirectory() as tmp_dir:
        for i, img in enumerate(images):
            page_path = os.path.join(tmp_dir, f"page_{i + 1}.jpg")
            try:
                img.save(page_path, "JPEG")
                page_text = _google_ocr_image(page_path)
                pages_text.append(page_text)
                logger.debug("Google Vision page %d: %d chars", i + 1, len(page_text))
            except Exception as exc:
                logger.error("Google Vision failed on page %d: %s", i + 1, exc)

    return "\n".join(pages_text)


# ---------------------------------------------------------------------------
# Image OCR — Google Vision
# ---------------------------------------------------------------------------

def _google_ocr_image(image_path: str) -> str:
    """
    Send an image file to the Google Cloud Vision API and return
    the detected text (full document text, not just individual words).

    Args:
        image_path: Path to a JPEG, PNG, or other supported image.

    Returns:
        Detected text string, or "" on failure.
    """
    try:
        client = vision.ImageAnnotatorClient()

        with open(image_path, "rb") as f:
            content = f.read()

        image = vision.Image(content=content)
        response = client.text_detection(image=image)

        if response.error.message:
            logger.error("Google Vision API error: %s", response.error.message)
            return ""

        annotations = response.text_annotations
        if annotations:
            # annotations[0].description is the full concatenated text block
            return annotations[0].description

        return ""

    except Exception as exc:
        logger.error("Google Vision OCR failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Quality check
# ---------------------------------------------------------------------------

def _is_garbled(text: str) -> bool:
    """
    Return True if the text contains too many CID tokens — a sign that
    the PDF's font map is broken and OCR will produce better output.
    """
    cid_hits = len(re.findall(r"\(cid:\d+\)", text))
    total_words = max(len(text.split()), 1)
    ratio = cid_hits / total_words
    if ratio > CID_THRESHOLD:
        logger.warning(
            "CID ratio %.2f%% exceeds %.0f%% threshold — text is garbled",
            ratio * 100,
            CID_THRESHOLD * 100,
        )
        return True
    return False