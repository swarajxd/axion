import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { getAuthenticatedSupabase } from '../services/supabase';
import { getUserProfile } from '../services/userService';

/**
 * usePostAuthRedirect
 *
 * Used on Login and Signup pages.
 * If a Clerk session is already active when the page loads,
 * redirect the user away so they don't sit on the auth page.
 *
 * Routing logic:
 *   - No profile or onboarding_completed = false → /onboarding
 *   - onboarding_completed = true               → /dashboard
 */
export function usePostAuthRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const profile = await getUserProfile(supabase, user.id);

        if (!profile || !profile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        // If Supabase check fails, fall through — user stays on auth page.
      }
    })();
  }, [isLoaded, isSignedIn, user, getToken, navigate]);
}

/**
 * usePostAuthDecision
 *
 * Performs the Supabase profile check and returns a redirect target.
 * Used inside /post-auth after Google OAuth completes.
 *
 * Returns:
 *   { isReady: true, redirectTo: '/onboarding' | '/dashboard' }
 *   or { isReady: false } while loading.
 */
export function usePostAuthDecision(): { isReady: boolean; redirectTo: string | null } {
  // This hook is intentionally stateless — see PostAuth.tsx which handles
  // this logic imperatively in a useEffect for simplicity.
  return { isReady: false, redirectTo: null };
}

/**
 * useOnboardingAccess
 *
 * Guards the /onboarding page.
 *
 *   - Not signed in          → redirect to /login
 *   - Already onboarded      → redirect to /dashboard
 *   - Needs onboarding       → allow access (isReady = true)
 */
export function useOnboardingAccess(): { isReady: boolean; isLoading: boolean } {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const profile = await getUserProfile(supabase, user.id);

        if (cancelled) return;
        if (profile?.onboarding_completed) {
          navigate('/dashboard', { replace: true });
          return;
        }

        setState('ready');
      } catch {
        // On error, allow the user to proceed with onboarding.
        if (!cancelled) setState('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, getToken, navigate]);

  return { isReady: state === 'ready', isLoading: !isLoaded || state !== 'ready' };
}

/**
 * Guards the /dashboard page.
 *
 * Routing logic:
 * - Not signed in                      → /login
 * - No profile or onboarding incomplete → /onboarding
 * - Onboarding completed              → allow access
 */
export function useDashboardAccess(): { isReady: boolean; isLoading: boolean } {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const profile = await getUserProfile(supabase, user.id);

        if (cancelled) return;
        if (!profile || !profile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        setState('ready');
      } catch {
        // If Supabase check fails, keep the UX responsive.
        if (!cancelled) setState('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, getToken, navigate]);

  return { isReady: state === 'ready', isLoading: !isLoaded || state !== 'ready' };
}