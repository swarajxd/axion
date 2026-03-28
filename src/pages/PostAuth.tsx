import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { getAuthenticatedSupabase } from '../services/supabase';
import { getUserProfile } from '../services/userService';

/**
 * PostAuth
 *
 * This page sits at /post-auth and serves two purposes:
 *
 * 1. Once Clerk signals the user is signed in, it queries Supabase to decide
 *    whether to send the user to /onboarding or /dashboard.
 *
 * This component must NOT render any meaningful UI — it's a pure redirect
 * handler. A minimal loading screen is shown while work completes.
 */
export default function PostAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const source = new URLSearchParams(location.search).get('source'); // email_login | email_signup | google

  useEffect(() => {
    // Wait for Clerk to finish loading AND for the user to be signed in.
    if (!isLoaded || !isSignedIn || !user) return;
    // Prevent running the redirect logic more than once.
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const profile = await getUserProfile(supabase, user.id);

        if (!profile) {
          // Email/password login should send users without a Supabase profile to signup.
          if (source === 'email_login') {
            navigate('/signup', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
          return;
        }

        if (!profile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch {
        // If we can't check Supabase, send to onboarding as a safe fallback.
        navigate(source === 'email_login' ? '/signup' : '/onboarding', { replace: true });
      }
    })();
  }, [isLoaded, isSignedIn, user, getToken, navigate]);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant text-sm font-medium">Signing you in…</p>
        </div>
      </div>
    </>
  );
}
