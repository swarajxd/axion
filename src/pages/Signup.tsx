import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useClerk, useSignUp, useSignIn, useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket } from 'lucide-react';
import { getClerkErrorMessage } from '../utils/clerkError';
import { getAuthenticatedSupabase } from '../services/supabase';
import { checkOnboardingStatus } from '../services/userService';

// Number of OTP digits Clerk sends
const OTP_LENGTH = 6;

export default function Signup() {
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { setActive } = useClerk();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // OTP state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const googleInProgress = useRef(false);
  const emailInProgress = useRef(false);
  const otpVerifyInProgress = useRef(false);
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

    setError(null);
    setOauthLoading(true);
    googleInProgress.current = true;
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

  // ─── Email + Password signup ───────────────────────────────────────────────
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    if (isSignedIn) return;
    if (emailInProgress.current || loading || oauthLoading) return;

    emailInProgress.current = true;
    setError(null);
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Trigger the OTP email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Show the inline OTP input
      setShowOtp(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(getClerkErrorMessage(err));
      emailInProgress.current = false;
    } finally {
      setLoading(false);
      emailInProgress.current = false;
    }
  };

  // ─── OTP digit input helpers ──────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    // Auto-advance focus
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && next.every(Boolean) && next.join('').length === OTP_LENGTH) {
      verifyOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) verifyOtp(pasted);
  };

  // ─── OTP verification ─────────────────────────────────────────────────────
  const verifyOtp = async (code: string) => {
    if (!signUp) return;
    if (otpVerifyInProgress.current) return;
    if (otpLoading) return;

    setError(null);
    setOtpLoading(true);
    otpVerifyInProgress.current = true;
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate('/post-auth?source=email_signup', { replace: true });
        return;
      }

      setError('Verification incomplete. Please try again.');
    } catch (err) {
      setError(getClerkErrorMessage(err));
      // Reset OTP boxes on failure
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setOtpLoading(false);
      otpVerifyInProgress.current = false;
    }
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    verifyOtp(otp.join(''));
  };

  const handleResend = async () => {
    if (!signUp) return;
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(getClerkErrorMessage(err));
    }
  };

  if (!isSignUpLoaded || !isSignInLoaded || !isUserLoaded) {
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
                src="https://picsum.photos/seed/signup/600/600" 
                alt="Signup" 
                className="rounded-lg transform rotate-2 hover:rotate-0 transition-transform duration-700 w-full"
              />
            </div>
            <div className="absolute -top-4 -left-4 bg-tertiary p-5 rounded-2xl shadow-2xl transform -rotate-12">
              <Rocket className="text-white" size={32} />
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-5xl text-primary tracking-tight mb-8 leading-tight">
            Join the Digital Atelier <br/>for Students.
          </h1>
          <p className="text-on-surface-variant text-xl max-w-md mx-auto leading-relaxed opacity-80">
            Start your journey toward academic excellence with AI-powered tools designed for focus and mastery.
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
          <AnimatePresence mode="wait">
            {!showOtp ? (
              /* ── Signup form ────────────────────────────────────────── */
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-12">
                  <h2 className="font-headline font-bold text-4xl text-on-surface tracking-tight mb-3">Create your account</h2>
                  <p className="text-on-surface-variant text-lg opacity-70">Join 12,000+ students studying smarter.</p>
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
                      {oauthLoading ? 'Redirecting…' : 'Sign up with Google'}
                    </span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-outline-variant/10"></div>
                    </div>
                    <span className="relative bg-background px-4 text-xs font-bold text-outline-variant uppercase tracking-widest">or</span>
                  </div>

                  <form className="space-y-6" onSubmit={handleSignup}>
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
                    <Input
                      label="Create Password"
                      placeholder="••••••••"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    <Button className="w-full h-16" type="submit" disabled={loading || oauthLoading}>
                      {loading ? 'Creating account…' : 'Continue →'}
                    </Button>
                  </form>

                  <p className="text-center text-on-surface-variant text-base">
                    Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              /* ── OTP verification ───────────────────────────────────── */
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-12">
                  <h2 className="font-headline font-bold text-4xl text-on-surface tracking-tight mb-3">Check your inbox</h2>
                  <p className="text-on-surface-variant text-lg opacity-70">
                    We sent a 6-digit code to <span className="font-bold text-on-surface">{email}</span>.
                  </p>
                </div>

                <div className="space-y-8">
                  {error && (
                    <p className="text-sm font-medium text-red-600" role="alert">
                      {error}
                    </p>
                  )}

                  <form className="space-y-8" onSubmit={handleOtpSubmit}>
                    {/* OTP digit boxes */}
                    <div className="flex gap-3 justify-between">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          disabled={otpLoading}
                          className="
                            w-full aspect-square text-center text-2xl font-bold
                            bg-surface-container-low rounded-2xl
                            border-2 border-transparent
                            focus:outline-none focus:border-primary focus:bg-white
                            transition-all duration-200
                            text-on-surface caret-primary
                            disabled:opacity-50
                          "
                          aria-label={`OTP digit ${i + 1}`}
                        />
                      ))}
                    </div>

                    <Button
                      className="w-full h-16"
                      type="submit"
                      disabled={otpLoading || otp.join('').length < OTP_LENGTH}
                    >
                      {otpLoading ? 'Verifying…' : 'Verify Email →'}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setShowOtp(false); setError(null); setOtp(Array(OTP_LENGTH).fill('')); }}
                      className="text-on-surface-variant hover:text-on-surface font-medium transition-colors"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-primary font-bold hover:underline"
                    >
                      Resend code
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
}