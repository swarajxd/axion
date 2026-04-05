"""
upload.py — FastAPI routes for file ingestion + RAG storage + retrieval.

POST /api/upload
    Full pipeline: classify → Supabase storage → DB → ChromaDB RAG ingestion

GET  /api/notes             — NCERT chapter structure with user's notes
GET  /api/notes/recent      — Most recently uploaded notes
GET  /api/notes/summary     — Per-subject counts for the Notes page cards

GET  /api/search            — Semantic search over the RAG knowledge base
GET  /api/rag/stats         — ChromaDB collection stats (debug)
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
from rag.rag_pipeline import run_pipeline as rag_ingest, search as rag_search, get_stats as rag_stats

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

@router.post("/upload", summary="Upload, classify, store, and index a note")
async def upload(
    file: UploadFile,
    x_user_id: str = Header(..., description="Clerk user ID"),
) -> JSONResponse:
    """
    Full ingestion pipeline:
      1. Classify text (subject / chapter / class)
      2. Upload file to Supabase Storage
      3. Save metadata row to Supabase DB
      4. Chunk + embed + store in ChromaDB for RAG
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

        loop = asyncio.get_event_loop()

        # ── Stage 1: Classify (extraction + subject + chapter) ────────────
        result = await asyncio.wait_for(
            loop.run_in_executor(None, process_file, str(temp_path)),
            timeout=REQUEST_TIMEOUT,
        )

        if "error" in result:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content=result,
            )

        subject     = result["subject"]
        chapter     = result.get("chapter") or "Other"
        class_level = result.get("class") or "11"
        confidence  = result.get("confidence", 0.0)
        clean_text  = result.get("text_preview", "")  # full text for RAG
        title       = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        # ── Stage 2: Upload to Supabase Storage ───────────────────────────
        file_url = ""
        try:
            file_url = await loop.run_in_executor(
                None, upload_file, contents, filename, x_user_id
            )
        except Exception as exc:
            logger.error("Storage upload failed: %s", exc)
            result["warning"] = f"File classified but storage failed: {exc}"

        # ── Stage 3: Save to Supabase DB ──────────────────────────────────
        note_id = None
        if file_url:
            try:
                db_row = await loop.run_in_executor(
                    None,
                    lambda: insert_note(
                        user_id=x_user_id,
                        subject=subject,
                        class_level=class_level,
                        chapter=chapter,
                        title=title,
                        file_url=file_url,
                        file_size=len(contents),
                        confidence=confidence,
                    ),
                )
                note_id = db_row.get("id")
                result["note_id"]  = note_id
                result["file_url"] = file_url
                result["title"]    = title
            except Exception as exc:
                logger.error("DB insert failed: %s", exc)
                result["warning"] = f"Classified but DB save failed: {exc}"

        # ── Stage 4: RAG ingestion (chunk → embed → ChromaDB) ─────────────
        # We use the full extracted text stored in pipeline result.
        # If text_preview is truncated, pass char_count as a signal.
        # In production you'd pass the full text through; here we use preview
        # as a clean demonstration — extend process_file() to return full text.
        full_text = result.get("text_preview", "")
        if full_text.strip():
            try:
                rag_result = await loop.run_in_executor(
                    None,
                    lambda: rag_ingest(
                        text=full_text,
                        subject=subject,
                        chapter=chapter,
                        source=filename,
                        class_level=class_level,
                        user_id=x_user_id,
                        replace_existing=True,
                    ),
                )
                result["rag"] = rag_result
                logger.info(
                    "RAG ingestion: %d chunks for '%s / %s'",
                    rag_result.get("chunks_upserted", 0), subject, chapter,
                )
            except Exception as exc:
                logger.error("RAG ingestion failed: %s", exc)
                result["rag_warning"] = f"RAG ingestion failed: {exc}"
        else:
            result["rag_warning"] = "No text available for RAG ingestion."

    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={"error": "Request timed out", "detail": "Try again with a smaller file."},
        )
    except Exception as exc:
        logger.exception("Unexpected error during upload")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()

    if "error" in result and "note_id" not in result:
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=result)

    return JSONResponse(status_code=200, content=result)


# ---------------------------------------------------------------------------
# GET /api/notes
# ---------------------------------------------------------------------------

@router.get("/notes", summary="NCERT chapter structure with user notes")
async def get_notes(
    subject:     str = Query(...),
    class_level: str = Query(..., alias="class"),
    x_user_id:   str = Header(...),
) -> JSONResponse:
    subject_map = {
        "physics": "Physics", "chemistry": "Chemistry",
        "mathematics": "Mathematics", "maths": "Mathematics", "math": "Mathematics",
    }
    subject_normalised = subject_map.get(subject.lower(), subject)

    if subject_normalised not in NCERT.get(class_level, {}):
        raise HTTPException(status_code=400, detail=f"No NCERT data for subject='{subject}' class='{class_level}'")

    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, lambda: get_notes_by_subject(x_user_id, subject_normalised, class_level)
    )

    notes_by_chapter: dict[str, list[dict]] = {}
    for row in rows:
        ch = row.get("chapter", "Other")
        notes_by_chapter.setdefault(ch, []).append(row)

    chapters = [
        {
            "name":  ch_name,
            "notes": [_serialize_note(n) for n in notes_by_chapter.get(ch_name, [])],
        }
        for ch_name in NCERT[class_level][subject_normalised]
    ]

    if notes_by_chapter.get("Other"):
        chapters.append({
            "name":  "Other",
            "notes": [_serialize_note(n) for n in notes_by_chapter["Other"]],
        })

    return JSONResponse(content={
        "subject":     subject_normalised,
        "class":       class_level,
        "chapters":    chapters,
        "total_notes": len(rows),
    })


# ---------------------------------------------------------------------------
# GET /api/notes/recent
# ---------------------------------------------------------------------------

@router.get("/notes/recent", summary="Recently uploaded notes")
async def recent_notes(
    x_user_id: str = Header(...),
    limit: int = Query(5, ge=1, le=20),
) -> JSONResponse:
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(None, lambda: get_recent_notes(x_user_id, limit))
    return JSONResponse(content={"notes": [_serialize_note(r) for r in rows]})


# ---------------------------------------------------------------------------
# GET /api/notes/summary
# ---------------------------------------------------------------------------

@router.get("/notes/summary", summary="Per-subject note counts and recent notes")
async def notes_summary(
    class_level: str = Query(..., alias="class"),
    x_user_id:   str = Header(...),
) -> JSONResponse:
    loop = asyncio.get_event_loop()
    summary = await loop.run_in_executor(
        None, lambda: get_subject_summary(x_user_id, class_level)
    )
    return JSONResponse(content={"summary": summary, "class": class_level})


# ---------------------------------------------------------------------------
# GET /api/search  — RAG semantic search
# ---------------------------------------------------------------------------

@router.get("/search", summary="Semantic search over the RAG knowledge base")
async def search(
    q:           str = Query(..., description="Search query"),
    top_k:       int = Query(5, ge=1, le=20),
    subject:     str | None = Query(None),
    chapter:     str | None = Query(None),
    class_level: str | None = Query(None, alias="class"),
    x_user_id:   str = Header(...),
) -> JSONResponse:
    """
    Search the ChromaDB knowledge base using semantic similarity.

    Example:
        GET /api/search?q=what+is+Ohm%27s+law&subject=Physics&class=12&top_k=5
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(
            None,
            lambda: rag_search(
                query=q,
                top_k=top_k,
                subject=subject,
                chapter=chapter,
                class_level=class_level,
                user_id=x_user_id,
            ),
        )
    except Exception as exc:
        logger.exception("Search failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(content={"query": q, "results": results, "count": len(results)})


# ---------------------------------------------------------------------------
# GET /api/rag/stats
# ---------------------------------------------------------------------------

@router.get("/rag/stats", summary="ChromaDB collection statistics")
async def rag_collection_stats() -> JSONResponse:
    loop = asyncio.get_event_loop()
    stats = await loop.run_in_executor(None, rag_stats)
    return JSONResponse(content=stats)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_note(row: dict) -> dict:
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