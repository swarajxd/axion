import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useClerk, useSignIn, useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';
import { getClerkErrorMessage } from '../utils/clerkError';
import { getAuthenticatedSupabase } from '../services/supabase';
import { checkOnboardingStatus } from '../services/userService';

export default function Login() {
  const { isLoaded, signIn } = useSignIn();
  const { setActive } = useClerk();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const googleInProgress = useRef(false);
  const emailInProgress = useRef(false);
  const [redirectingAuthedUser, setRedirectingAuthedUser] = useState(false);

  useEffect(() => {
    if (!isUserLoaded) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;
    setRedirectingAuthedUser(true);

    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const { needsOnboarding } = await checkOnboardingStatus(supabase, user.id);
        if (cancelled) return;
        navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
      } catch {
        if (cancelled) return;
        navigate('/dashboard', { replace: true });
      } finally {
        if (!cancelled) setRedirectingAuthedUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isUserLoaded, isSignedIn, user, getToken, navigate]);

  // ─── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!signIn) return;
    if (isSignedIn) return;
    if (googleInProgress.current || oauthLoading) return;

    if (!signIn) return;
    setError(null);
    googleInProgress.current = true;
    setOauthLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/post-auth`,
      });
    } catch (err) {
      setError(getClerkErrorMessage(err));
      setOauthLoading(false);
      googleInProgress.current = false;
    }
  };

  // ─── Email + Password login ────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    if (isSignedIn) return;
    if (emailInProgress.current || loading || oauthLoading) return;

    emailInProgress.current = true;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        // Activate the Clerk session, then route via /post-auth
        await setActive({ session: result.createdSessionId });
        navigate('/post-auth?source=email_login', { replace: true });
        return;
      }

      setError('Additional verification is required. Please try another method or contact support.');
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setLoading(false);
      emailInProgress.current = false;
    }
  };

  if (!isLoaded || !isUserLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        Loading…
      </div>
    );
  }

  if (redirectingAuthedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Illustration */}
      <section className="hidden lg:flex lg:w-1/2 relative bg-surface-container-low overflow-hidden items-center justify-center p-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-xl text-center">
          <div className="mb-16 relative inline-block">
            <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl shadow-premium">
              <img 
                src="https://picsum.photos/seed/sanctuary/600/600" 
                alt="Sanctuary" 
                className="rounded-lg transform -rotate-2 hover:rotate-0 transition-transform duration-700 w-full"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-primary p-5 rounded-2xl shadow-2xl transform rotate-12">
              <Rocket className="text-white" size={32} />
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-5xl text-primary tracking-tight mb-8 leading-tight">
            Your Digital Atelier <br/>for Academic Excellence.
          </h1>
          <p className="text-on-surface-variant text-xl max-w-md mx-auto leading-relaxed opacity-80">
            A calm, structured workspace designed to help you focus, organize notes, and master your exams with ease.
          </p>
        </div>
      </section>

      {/* Right: Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-12">
            <h2 className="font-headline font-bold text-4xl text-on-surface tracking-tight mb-3">Welcome to V Study</h2>
            <p className="text-on-surface-variant text-lg opacity-70">Sign in to continue your learning journey.</p>
          </div>

          <div className="space-y-8">
            {error && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={oauthLoading || loading}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-4 bg-white hover:bg-surface-container-low border border-outline-variant/10 h-14 rounded-2xl transition-all duration-300 shadow-sm group disabled:opacity-60 disabled:pointer-events-none"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span className="font-bold text-on-surface tracking-tight">
                {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
              </span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/10"></div>
              </div>
              <span className="relative bg-background px-4 text-xs font-bold text-outline-variant uppercase tracking-widest">or</span>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              <Input
                label="Email Address"
                placeholder="name@example.com"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-on-surface-variant/80 tracking-widest uppercase">Password</label>
                  <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot?</a>
                </div>
                <Input
                  placeholder="••••••••"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button className="w-full h-16" type="submit" disabled={loading || oauthLoading}>
                {loading ? 'Signing in…' : 'Get Started →'}
              </Button>
            </form>

            <p className="text-center text-on-surface-variant text-base">
              Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Create a free profile</Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}