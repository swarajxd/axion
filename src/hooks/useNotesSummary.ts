import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getNotesSummary, getRecentNotes, SubjectSummary, NoteRow } from '../services/notesApi';

export function useNotesSummary(classLevel: string) {
  const { user } = useUser();
  const [summary, setSummary]   = useState<SubjectSummary[]>([]);
  const [recent, setRecent]     = useState<NoteRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        getNotesSummary(user.id, classLevel),
        getRecentNotes(user.id, 5),
      ]);
      setSummary(s);
      setRecent(r);
    } catch (err: any) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [user?.id, classLevel]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, recent, loading, error, refetch: fetch };
}