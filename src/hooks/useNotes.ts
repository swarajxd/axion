import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getNotes, NotesResponse } from '../services/notesApi';

export function useNotes(subject: string, classLevel: string) {
  const { user } = useUser();
  const [data, setData]       = useState<NotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getNotes(user.id, subject, classLevel);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [user?.id, subject, classLevel]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}