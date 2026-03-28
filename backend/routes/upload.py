"""
upload.py — FastAPI route for file ingestion.

POST /api/upload
    Accepts multipart file, saves to temp/, runs pipeline, returns JSON.
    Temp file is always deleted after processing (finally block).
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from ai.pipeline import process_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ingestion"])

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg", "image/jpg", "image/png",
    "image/bmp", "image/tiff", "image/webp",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", summary="Upload and classify a study file")
async def upload(file: UploadFile) -> JSONResponse:
    """
    Upload a PDF or image and receive NCERT classification metadata.

    Success response (200):
    ```json
    {
      "class": "12",
      "subject": "Physics",
      "chapter": "Current Electricity",
      "confidence": 0.87,
      "text_preview": "...",
      "char_count": 4200
    }
    ```
    Error response (422):
    ```json
    { "error": "Could not detect subject", "detail": "...", ... }
    ```
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Upload a PDF or image.",
        )

    # Read and size-check
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit.",
        )

    # Save to unique temp path
    ext = Path(file.filename or "upload").suffix.lower() or ".bin"
    temp_path = TEMP_DIR / f"{uuid.uuid4().hex}{ext}"

    try:
        temp_path.write_bytes(contents)
        logger.info("Saved temp file: %s (%d bytes)", temp_path, len(contents))

        result = process_file(str(temp_path))

    except Exception as exc:
        logger.exception("Unexpected error during processing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {exc}",
        ) from exc

    finally:
        if temp_path.exists():
            temp_path.unlink()
            logger.debug("Deleted temp file: %s", temp_path)

    # Pipeline errors → 422 with full detail in body
    if "error" in result:
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=result)

    return JSONResponse(status_code=status.HTTP_200_OK, content=result)