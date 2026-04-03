/**
 * notesApi.ts — Typed fetch wrappers for VStudy notes backend.
 *
 * All requests attach X-User-Id from Clerk so the backend can
 * namespace storage and DB queries per user.
 */

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NoteRow {
  id: string;
  title: string;
  chapter: string;
  subject: string;
  class: string;
  file_url: string;
  file_size: number;
  confidence: number;
  created_at: string;
}

export interface ChapterWithNotes {
  name: string;
  notes: NoteRow[];
}

export interface NotesResponse {
  chapters: ChapterWithNotes[];
}

export interface SubjectSummary {
  subject: string;
  note_count: number;
  recent: NoteRow[];
}

export interface SummaryResponse {
  summary: SubjectSummary[];
  class: string;
}

export interface UploadResult {
  subject: string;
  class: string;
  chapter: string;
  confidence: number;
  text_preview: string;
  char_count: number;
  note_id?: string;
  file_url?: string;
  title?: string;
  warning?: string;
  error?: string;
  detail?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function headers(userId: string): HeadersInit {
  return {
    'X-User-Id': userId,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  return data as T;
}

// ── API calls ─────────────────────────────────────────────────────────────

/**
 * Upload a file, classify it, store it, and save to DB.
 */
export async function uploadNote(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: headers(userId),
    body: form,
  });

  return handleResponse<UploadResult>(res);
}

/**
 * Get all NCERT chapters + notes for a subject/class combo.
 * Chapters with no notes are still returned (empty notes array).
 */
export async function getNotes(
  userId: string,
  subject: string,
  classLevel: string,
): Promise<NotesResponse> {
  const params = new URLSearchParams({ subject, class: classLevel });
  const res = await fetch(`${BASE}/api/notes?${params}`, {
    headers: headers(userId),
  });
  return handleResponse<NotesResponse>(res);
}

/**
 * Get recently uploaded notes across all subjects.
 */
export async function getRecentNotes(
  userId: string,
  limit = 5,
): Promise<NoteRow[]> {
  const res = await fetch(`${BASE}/api/notes/recent?limit=${limit}`, {
    headers: headers(userId),
  });
  const data = await handleResponse<{ notes: NoteRow[] }>(res);
  return data.notes;
}

/**
 * Get per-subject note counts + recent notes for the Notes page cards.
 */
export async function getNotesSummary(
  userId: string,
  classLevel: string,
): Promise<SubjectSummary[]> {
  const params = new URLSearchParams({ class: classLevel });
  const res = await fetch(`${BASE}/api/notes/summary?${params}`, {
    headers: headers(userId),
  });
  const data = await handleResponse<SummaryResponse>(res);
  return data.summary;
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Format ISO timestamp to relative string */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}