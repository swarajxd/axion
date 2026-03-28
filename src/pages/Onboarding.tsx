import { useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'motion/react';
import { Rocket, Beaker } from 'lucide-react';
import { useOnboardingAccess } from '../hooks/useAuthRedirect';
import { getAuthenticatedSupabase } from '../services/supabase';
import { createUserProfile } from '../services/userService';
import { getClerkErrorMessage } from '../utils/clerkError';

export default function Onboarding() {
  const navigate = useNavigate();
  const { userId, getToken } = useAuth();
  const { isReady, isLoading } = useOnboardingAccess();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stream, setStream] = useState('Science');
  const [standard, setStandard] = useState<'11th' | '12th'>('11th');
  const [targetExam, setTargetExam] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setSubmitting(true);
    try {
      const supabase = await getAuthenticatedSupabase(getToken);
      await createUserProfile(supabase, userId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        stream,
        standard,
        target_exam: targetExam.trim() || null,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full px-8 py-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-primary tracking-tighter font-headline">V Study</div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-surface-container-low rounded-full border border-outline-variant/10">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/30"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/30"></span>
            </div>
            <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider ml-2">Step 1 of 3</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-3xl relative">
          <div className="absolute -top-32 -right-24 w-48 h-48 opacity-10 pointer-events-none transform rotate-12 md:opacity-100">
            <Rocket className="text-primary" size={160} />
          </div>
          <div className="absolute -bottom-32 -left-24 w-48 h-48 opacity-10 pointer-events-none transform -rotate-12 md:opacity-100">
            <Beaker className="text-tertiary" size={160} />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-10 md:p-20 shadow-premium border border-surface-container-high"
          >
            <div className="mb-14 text-center">
              <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight mb-4">Set your trajectory.</h1>
              <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">Tell us about your academic goals to personalize your digital atelier.</p>
            </div>

            <form className="space-y-12" onSubmit={handleContinue}>
              {error && (
                <p className="text-sm font-medium text-red-600 text-center" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input
                    label="First Name"
                    placeholder="Alex"
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="Sterling"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/80 ml-1">Academic Stream</label>
                    <select
                      name="stream"
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all duration-300 outline-none text-on-surface cursor-pointer appearance-none"
                    >
                      <option>Science</option>
                      <option>Commerce</option>
                      <option>Humanities</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/80 ml-1">Current Standard</label>
                    <div className="flex gap-4">
                      {(['11th', '12th'] as const).map((std) => (
                        <label key={std} className="flex-1 cursor-pointer group">
                          <input
                            type="radio"
                            name="standard"
                            className="hidden peer"
                            checked={standard === std}
                            onChange={() => setStandard(std)}
                          />
                          <div className="text-center py-4 bg-surface-container-low rounded-2xl text-on-surface-variant font-bold border-2 border-transparent peer-checked:bg-primary-container peer-checked:text-white peer-checked:border-primary/20 transition-all group-hover:bg-surface-container-high">
                            {std}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input
                    label="Target exam (optional)"
                    placeholder="e.g. JEE Main"
                    name="targetExam"
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button className="w-full h-16" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue Journey →'}
                </Button>
                <p className="text-center mt-8 text-xs text-on-surface-variant/60 font-medium">
                  By continuing, you agree to our <a href="#" className="text-primary hover:underline font-bold">Terms of Service</a>.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}