import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
}

/**
 * Unauthenticated Supabase client — use only for public queries.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Returns a Supabase client authenticated with the current Clerk session JWT.
 * Pass the `getToken` function from Clerk's `useAuth()` hook.
 *
 * @example
 * const { getToken } = useAuth();
 * const client = await getAuthenticatedSupabase(getToken);
 */
export async function getAuthenticatedSupabase(
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<SupabaseClient> {
  const token = await getToken({ template: 'supabase' });

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}