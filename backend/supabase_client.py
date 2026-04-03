"""
supabase_client.py — Shared Supabase client for Axion backend.

Uses the service-role key so it can bypass RLS and write on behalf
of the authenticated user (user_id passed explicitly from the route).

Never expose the service-role key to the frontend.
"""

from __future__ import annotations

import os
from functools import lru_cache
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url  = os.environ.get("SUPABASE_URL", "")
    key  = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
        )

    return create_client(url, key)