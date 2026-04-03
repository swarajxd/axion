"""
notes_db.py — Database operations for the notes table.

All queries use the service-role Supabase client so they work
regardless of the calling user's auth state.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from supabase_client import get_supabase

logger = logging.getLogger(__name__)


def insert_note(
    user_id: str,
    subject: str,
    class_level: str,
    chapter: str,
    title: str,
    file_url: str,
    file_size: int = 0,
    confidence: float = 0.0,
) -> dict:
    """
    Insert a classified note into the notes table.

    Returns the inserted row dict.
    """
    row = {
        "user_id":    user_id,
        "subject":    subject,
        "class":      class_level,
        "chapter":    chapter,
        "title":      title,
        "file_url":   file_url,
        "file_size":  file_size,
        "confidence": round(confidence, 4),
    }

    response = get_supabase().table("notes").insert(row).execute()
    inserted = response.data[0] if response.data else row
    logger.info("Inserted note: id=%s chapter=%s", inserted.get("id"), chapter)
    return inserted


def get_notes_by_subject(
    user_id: str,
    subject: str,
    class_level: str,
) -> list[dict]:
    """
    Fetch all notes for a user filtered by subject + class.

    Returns a flat list of note rows, ordered by created_at desc.
    """
    response = (
        get_supabase()
        .table("notes")
        .select("*")
        .eq("user_id", user_id)
        .eq("subject", subject)
        .eq("class", class_level)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_recent_notes(user_id: str, limit: int = 5) -> list[dict]:
    """Fetch the most recently uploaded notes across all subjects."""
    response = (
        get_supabase()
        .table("notes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def get_subject_summary(user_id: str, class_level: str) -> list[dict]:
    """
    Return note counts + 3 most recent notes per subject for the
    Notes page subject cards.
    """
    subjects = ["Physics", "Chemistry", "Mathematics"]
    summary = []

    for subject in subjects:
        rows = get_notes_by_subject(user_id, subject, class_level)
        summary.append({
            "subject":    subject,
            "note_count": len(rows),
            "recent":     rows[:3],
        })

    return summary