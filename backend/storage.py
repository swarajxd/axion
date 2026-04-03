"""
storage.py — Upload files to Supabase Storage bucket "notes".

Returns the public URL so it can be stored in the notes table
and rendered directly in the frontend.
"""

from __future__ import annotations

import logging
import mimetypes
import os
import uuid
from pathlib import Path

from supabase_client import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "notes"


def upload_file(file_bytes: bytes, original_filename: str, user_id: str) -> str:
    """
    Upload a file to Supabase Storage and return its public URL.

    Path inside bucket: {user_id}/{uuid}{ext}
    This namespaces files per user so bucket listing stays clean.

    Args:
        file_bytes:        Raw file content.
        original_filename: Original uploaded filename (for extension + MIME type).
        user_id:           Clerk user ID.

    Returns:
        Public URL string.

    Raises:
        RuntimeError: If the upload fails.
    """
    ext       = Path(original_filename).suffix.lower() or ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{user_id}/{unique_name}"

    mime_type, _ = mimetypes.guess_type(original_filename)
    mime_type = mime_type or "application/octet-stream"

    supabase = get_supabase()

    try:
        supabase.storage.from_(BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": mime_type},
        )
        logger.info("Uploaded to storage: %s", storage_path)
    except Exception as exc:
        raise RuntimeError(f"Supabase storage upload failed: {exc}") from exc

    # Build public URL
    url_response = supabase.storage.from_(BUCKET).get_public_url(storage_path)
    public_url = url_response if isinstance(url_response, str) else url_response.get("publicURL", "")

    logger.info("Public URL: %s", public_url)
    return public_url


def delete_file(storage_path: str) -> None:
    """Delete a file from storage by its path (for future use)."""
    try:
        get_supabase().storage.from_(BUCKET).remove([storage_path])
    except Exception as exc:
        logger.warning("Failed to delete storage file %s: %s", storage_path, exc)