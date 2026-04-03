import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Card } from '../components/ui/Card';
import { 
  Bell, 
  Search, 
  Zap, 
  Rocket, 
  Beaker, 
  ChevronLeft, 
  ChevronRight,
  Bot,
  GraduationCap
} from 'lucide-react';
import { useDashboardAccess } from '../hooks/useAuthRedirect';
import { getAuthenticatedSupabase } from '../services/supabase';
import { getUserProfile } from '../services/userService';

export default function Dashboard() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const { isReady, isLoading } = useDashboardAccess();
  const [greetingName, setGreetingName] = useState(user?.firstName ?? 'Student');

  useEffect(() => {
    if (!userId || !isReady) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getAuthenticatedSupabase(getToken);
        const profile = await getUserProfile(supabase, userId);
        if (cancelled) return;
        if (profile?.first_name) setGreetingName(profile.first_name);
        else if (user?.firstName) setGreetingName(user.firstName);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, getToken, isReady, user?.firstName]);

  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-12">
      {/* Header */}
      <header className="flex justify-between items-center mb-16 px-4">
          <div>
            <h2 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-3">
              Hello, {greetingName} 👋
            </h2>
            <p className="text-on-surface-variant font-medium text-lg">You've completed <span className="text-primary font-bold">85%</span> of your weekly goals. Keep it up!</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white p-4 rounded-2xl shadow-premium hover:shadow-premium-hover transition-all duration-300">
              <Bell className="text-primary" size={24} />
            </button>
            <button className="bg-white p-4 rounded-2xl shadow-premium hover:shadow-premium-hover transition-all duration-300">
              <Search className="text-primary" size={24} />
            </button>
          </div>
        </header>

        {/* Top Grid */}
        <div className="grid grid-cols-12 gap-10 mb-16">
          {/* Featured Quiz Card */}
          <div className="col-span-12 md:col-span-7 bg-gradient-to-br from-primary to-primary-dim p-10 rounded-xl relative overflow-hidden group shadow-premium hover:shadow-premium-hover transition-all duration-500">
            <div className="relative z-10 max-w-sm">
              <span className="bg-white/20 text-white px-5 py-1.5 rounded-full text-xs font-bold mb-6 inline-block backdrop-blur-md">Recommended</span>
              <h3 className="text-4xl font-headline font-extrabold text-white mb-6 leading-tight">Physics: Quantum Mechanics Quiz</h3>
              <p className="text-white/80 mb-8 text-lg leading-relaxed">Test your knowledge on wave-particle duality and Schrödinger's equation.</p>
              <button className="bg-white text-primary px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg">Attempt Quiz</button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-primary-container opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
          </div>

          {/* Daily Study Time */}
          <Card className="col-span-12 md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">Daily Study Time</h3>
                <div className="p-3 bg-tertiary/10 rounded-2xl text-tertiary">
                  <Zap size={24} fill="currentColor" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-headline font-black text-on-surface">4.5</span>
                <span className="text-on-surface-variant font-bold text-xl">/ 6 hours</span>
              </div>
              <p className="text-on-surface-variant text-base mb-8">You are 90 mins away from your goal!</p>
            </div>
            <div className="space-y-4">
              <div className="w-full h-4 bg-tertiary-container/30 rounded-full overflow-hidden">
                <div className="h-full bg-tertiary rounded-full w-[75%] shadow-sm"></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-tertiary/60 uppercase tracking-widest">
                <span>Started 8:00 AM</span>
                <span>75% Complete</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Middle Grid */}
        <div className="grid grid-cols-12 gap-10 mb-16">
          {/* Weekly Performance */}
          <Card className="col-span-12 lg:col-span-8">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-2xl font-headline font-extrabold">Weekly Performance</h3>
              <div className="flex gap-3">
                <span className="px-4 py-2 bg-surface-container-high/50 rounded-xl text-xs font-bold text-on-surface-variant">Focus Score</span>
                <span className="px-4 py-2 bg-primary/10 rounded-xl text-xs font-bold text-primary">Study Hours</span>
              </div>
            </div>
            <div className="h-72 flex items-end justify-between gap-6 px-4">
              {[40, 65, 85, 50, 95, 30, 20].map((height, i) => (
                <div 
                  key={i}
                  className={`w-full rounded-2xl transition-all duration-300 cursor-pointer group relative ${i === 4 ? 'bg-primary shadow-lg' : 'bg-primary/10 hover:bg-primary'}`}
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}: {(height / 10).toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-6 mt-6 px-4 text-center">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                <span key={day} className={`text-xs font-bold ${i === 4 ? 'text-primary' : 'text-on-surface-variant/50'}`}>{day}</span>
              ))}
            </div>
          </Card>

          {/* Right Widgets */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
            <Card className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h4 className="font-headline font-bold text-lg text-on-surface">November 2024</h4>
                <div className="flex gap-4 text-on-surface-variant">
                  <ChevronLeft size={20} className="cursor-pointer hover:text-primary" />
                  <ChevronRight size={20} className="cursor-pointer hover:text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-on-surface-variant/50 mb-4 uppercase tracking-widest">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {[12, 13, 14, 15, 16, 17, 18].map(d => (
                  <span key={d} className={`p-3 text-sm rounded-2xl font-bold ${d === 15 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-on-surface-variant'}`}>{d}</span>
                ))}
              </div>
            </Card>

            <Card className="p-8 flex-1">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-headline font-extrabold text-on-surface">Tasks</h3>
                <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">+ Add</button>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Physics Assignment', sub: 'Due in 2 hours • High Priority', color: 'bg-primary' },
                  { label: 'Chemistry Lab Prep', sub: 'Tomorrow, 10:00 AM • Lab', color: 'bg-secondary' },
                  { label: 'Maths Exercise 4.2', sub: 'Nov 18, 2024 • Homework', color: 'bg-tertiary' },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-5 group cursor-pointer">
                    <div className={`w-1.5 h-12 ${task.color} rounded-full group-hover:scale-y-110 transition-transform`}></div>
                    <div>
                      <p className="font-bold text-on-surface mb-0.5">{task.label}</p>
                      <p className="text-xs text-on-surface-variant/60">{task.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Subject Progress */}
        <section className="px-2">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-headline font-extrabold text-on-surface">Subject Progress</h3>
            <button className="bg-primary/10 text-primary px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-all duration-300">View All Courses</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Physics', current: 'Thermodynamics', progress: 65, chapters: 12, icon: Rocket, color: 'text-primary', bg: 'bg-primary/10' },
              { name: 'Chemistry', current: 'Organic Bonds', progress: 42, chapters: 8, icon: Beaker, color: 'text-secondary', bg: 'bg-secondary/10' },
              { name: 'Mathematics', current: 'Calculus III', progress: 88, chapters: 15, icon: GraduationCap, color: 'text-tertiary', bg: 'bg-tertiary/10' },
            ].map((sub) => (
              <Card key={sub.name} className="hover:-translate-y-1 transition-all duration-500">
                <div className="flex justify-between items-center mb-10">
                  <div className={`p-5 rounded-2xl ${sub.bg} ${sub.color}`}>
                    <sub.icon size={32} />
                  </div>
                  <span className="bg-surface-container-low text-on-surface-variant/60 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">{sub.chapters} Chapters</span>
                </div>
                <h4 className="text-2xl font-headline font-extrabold text-on-surface mb-2">{sub.name}</h4>
                <p className="text-on-surface-variant/60 text-sm mb-8">Currently: <span className="text-on-surface font-medium">{sub.current}</span></p>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Progress</span>
                    <span className={`text-lg font-black ${sub.color}`}>{sub.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sub.color.replace('text', 'bg')} w-[${sub.progress}%] shadow-sm`} style={{ width: `${sub.progress}%` }}></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

      {/* FAB AI Chat */}
      <div className="fixed bottom-12 right-12 z-[60]">
        <button className="w-20 h-20 bg-gradient-to-br from-primary to-primary-container rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group overflow-hidden">
          <Bot size={32} />
        </button>
      </div>
    </div>
  );
}
