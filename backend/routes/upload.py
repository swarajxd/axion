"""
upload.py — FastAPI route for file ingestion + storage + DB persistence.

POST /api/upload
    1. Save file temporarily
    2. Run classification pipeline (extract → clean → subject → chapter)
    3. Upload file to Supabase Storage
    4. Insert classified note into DB
    5. Return full result including DB row id and file_url

GET /api/notes
    Returns NCERT chapter structure with notes per chapter for a given
    user / subject / class combination.

GET /api/notes/recent
    Returns the 5 most recently uploaded notes across all subjects.

GET /api/notes/summary
    Returns per-subject note counts + recent notes for the Notes page cards.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse

from ai.pipeline import process_file
from ai.ncert_data import NCERT
from storage import upload_file
from notes_db import insert_note, get_notes_by_subject, get_recent_notes, get_subject_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["notes"])

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg", "image/jpg", "image/png",
    "image/bmp", "image/tiff", "image/webp",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
REQUEST_TIMEOUT     = 180


# ---------------------------------------------------------------------------
# POST /api/upload
# ---------------------------------------------------------------------------

@router.post("/upload", summary="Upload, classify, store, and save a note")
async def upload(
    file: UploadFile,
    x_user_id: str = Header(..., description="Clerk user ID"),
) -> JSONResponse:
    """
    Full pipeline: classify → storage → database.

    Requires header: X-User-Id: <clerk_user_id>
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit.",
        )

    filename  = file.filename or "upload"
    ext       = Path(filename).suffix.lower() or ".bin"
    temp_path = TEMP_DIR / f"{uuid.uuid4().hex}{ext}"

    try:
        temp_path.write_bytes(contents)
        logger.info("Saved temp file: %s (%d bytes)", temp_path, len(contents))

        # ── Step 1: Classify ──────────────────────────────────────────────
        loop   = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, process_file, str(temp_path)),
            timeout=REQUEST_TIMEOUT,
        )

        if "error" in result:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content=result,
            )

        # ── Step 2: Upload to Supabase Storage ────────────────────────────
        try:
            file_url = await loop.run_in_executor(
                None, upload_file, contents, filename, x_user_id
            )
        except Exception as exc:
            logger.error("Storage upload failed: %s", exc)
            # Don't block the user — return classification even if storage fails
            result["warning"] = f"File could not be stored: {exc}"
            file_url = ""

        # ── Step 3: Insert into DB ─────────────────────────────────────────
        chapter    = result.get("chapter") or "Other"
        title      = Path(filename).stem.replace("_", " ").replace("-", " ").title()
        confidence = result.get("confidence", 0.0)

        if file_url:
            try:
                db_row = await loop.run_in_executor(
                    None,
                    lambda: insert_note(
                        user_id     = x_user_id,
                        subject     = result["subject"],
                        class_level = result["class"] or "11",
                        chapter     = chapter,
                        title       = title,
                        file_url    = file_url,
                        file_size   = len(contents),
                        confidence  = confidence,
                    ),
                )
                result["note_id"]   = db_row.get("id")
                result["file_url"]  = file_url
                result["title"]     = title
            except Exception as exc:
                logger.error("DB insert failed: %s", exc)
                result["warning"] = f"Note classified but not saved to DB: {exc}"

    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={"error": "Request timed out", "detail": "Try again with a smaller file."},
        )
    except Exception as exc:
        logger.exception("Unexpected error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()

    return JSONResponse(status_code=200, content={"success": True, **result})


# ---------------------------------------------------------------------------
# GET /api/notes  — chapter structure with notes
# ---------------------------------------------------------------------------

@router.get("/notes", summary="Get NCERT chapter structure with user's notes")
async def get_notes(
    subject:    str = Query(..., description="Physics | Chemistry | Mathematics"),
    class_level: str = Query(..., alias="class", description="11 or 12"),
    x_user_id:  str = Header(..., description="Clerk user ID"),
) -> JSONResponse:
    """
    Returns ALL NCERT chapters for the subject/class, with the user's
    uploaded notes nested inside each chapter.
    Chapters with no notes still appear (empty notes array).
    """
    # Normalise subject casing
    subject_map = {
        "physics": "Physics",
        "chemistry": "Chemistry",
        "mathematics": "Mathematics",
        "maths": "Mathematics",
        "math": "Mathematics",
    }
    subject_normalised = subject_map.get(subject.lower(), subject)

    if subject_normalised not in NCERT.get(class_level, {}):
        raise HTTPException(
            status_code=400,
            detail=f"No NCERT data for subject='{subject}' class='{class_level}'",
        )

    # Fetch user's notes from DB
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None,
        lambda: get_notes_by_subject(x_user_id, subject_normalised, class_level),
    )

    # Index notes by chapter name for O(1) lookup
    notes_by_chapter: dict[str, list[dict]] = {}
    for row in rows:
        ch = row.get("chapter", "Other")
        notes_by_chapter.setdefault(ch, []).append(row)

    # Build NCERT chapter list — always include every chapter
    ncert_chapters = NCERT[class_level][subject_normalised]
    chapters = []

    for chapter_name in ncert_chapters:
        chapter_notes = notes_by_chapter.get(chapter_name, [])
        chapters.append({
            "name":  chapter_name,
            "notes": [_serialize_note(n) for n in chapter_notes],
        })

    # Append "Other" bucket if any notes didn't match a chapter
    other_notes = notes_by_chapter.get("Other", [])
    if other_notes:
        chapters.append({
            "name":  "Other",
            "notes": [_serialize_note(n) for n in other_notes],
        })

    return JSONResponse(content={"chapters": chapters})


# ---------------------------------------------------------------------------
# GET /api/notes/recent
# ---------------------------------------------------------------------------

@router.get("/notes/recent", summary="Most recently uploaded notes")
async def recent_notes(
    x_user_id: str = Header(..., description="Clerk user ID"),
    limit: int = Query(5, ge=1, le=20),
) -> JSONResponse:
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None,
        lambda: get_recent_notes(x_user_id, limit),
    )
    return JSONResponse(content={"notes": [_serialize_note(r) for r in rows]})


# ---------------------------------------------------------------------------
# GET /api/notes/summary  — for the Notes page subject cards
# ---------------------------------------------------------------------------

@router.get("/notes/summary", summary="Per-subject note counts and recent notes")
async def notes_summary(
    class_level: str = Query(..., alias="class", description="11 or 12"),
    x_user_id:   str = Header(..., description="Clerk user ID"),
) -> JSONResponse:
    loop = asyncio.get_event_loop()
    summary = await loop.run_in_executor(
        None,
        lambda: get_subject_summary(x_user_id, class_level),
    )
    return JSONResponse(content={"summary": summary, "class": class_level})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_note(row: dict) -> dict:
    """Return only the fields the frontend needs."""
    return {
        "id":         row.get("id", ""),
        "title":      row.get("title", ""),
        "chapter":    row.get("chapter", ""),
        "subject":    row.get("subject", ""),
        "class":      row.get("class", ""),
        "file_url":   row.get("file_url", ""),
        "file_size":  row.get("file_size", 0),
        "confidence": row.get("confidence", 0),
        "created_at": str(row.get("created_at", "")),
    }