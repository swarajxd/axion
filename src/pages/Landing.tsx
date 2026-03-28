import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion } from 'motion/react';
import { MessageSquare, GraduationCap, BarChart3, Calendar } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative pt-48 pb-40 overflow-hidden px-8">
          <div className="absolute top-0 right-0 w-[50%] h-[80%] bg-gradient-to-bl from-primary/5 to-transparent -z-10 blur-3xl rounded-full opacity-40"></div>
          
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 z-10"
            >
              <h1 className="font-headline text-on-surface font-extrabold text-6xl md:text-8xl leading-[1.05] tracking-tight mb-8">
                Your Personal <br/><span className="text-primary italic">Study System</span>
              </h1>
              <p className="text-on-surface-variant text-xl md:text-2xl max-w-xl mb-12 leading-relaxed opacity-80">
                Learn smarter with AI-powered notes, tests, and insights. Transform your scattered study materials into a cohesive learning journey.
              </p>
              <div className="flex flex-wrap gap-6">
                <Link to="/signup">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Button variant="secondary" size="lg">Watch Demo</Button>
              </div>
              
              <div className="mt-16 flex items-center gap-6">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map((i) => (
                    <img 
                      key={i}
                      className="w-12 h-12 rounded-full border-4 border-background" 
                      src={`https://picsum.photos/seed/student${i}/100/100`} 
                      alt="Student"
                    />
                  ))}
                </div>
                <p className="text-sm text-on-surface-variant font-medium tracking-tight">Join 2,000+ students studying smarter this week</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative w-full aspect-[4/5] bg-surface-container-low/50 rounded-xl flex items-center justify-center p-12">
                <img 
                  className="w-full h-full object-cover rounded-lg shadow-2xl relative z-10 transform lg:rotate-2 hover:rotate-0 transition-transform duration-700" 
                  src="https://picsum.photos/seed/study/800/1000" 
                  alt="Study illustration"
                />
                <div className="absolute -bottom-8 -right-8 bg-white p-8 rounded-lg shadow-2xl z-20 hidden md:block border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-tertiary/10 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 bg-tertiary rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] font-black">AI Status</p>
                      <p className="font-bold text-on-surface">Analysis Ready</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-surface-container-low/30 py-48 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <span className="text-primary font-black tracking-[0.3em] uppercase text-xs mb-6 block">Capabilities</span>
              <h2 className="font-headline text-on-surface text-5xl md:text-6xl font-extrabold mb-8">Designed for Peak Performance</h2>
              <p className="text-on-surface-variant text-xl max-w-2xl mx-auto opacity-70">Everything you need to master your curriculum, powered by next-gen cognitive AI.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <Card className="md:col-span-8 group">
                <div className="flex flex-col lg:flex-row gap-12 items-center">
                  <div className="flex-1">
                    <div className="text-primary mb-8"><MessageSquare size={48} /></div>
                    <h3 className="text-3xl font-bold mb-6">AI Chat from Notes</h3>
                    <p className="text-on-surface-variant leading-relaxed mb-8 text-lg">Ask questions directly to your textbooks and class notes. Our AI understands your specific curriculum and provides context-aware answers.</p>
                    <a href="#" className="text-primary font-bold flex items-center gap-2 group text-lg">
                      Learn more <span className="group-hover:translate-x-2 transition-transform">→</span>
                    </a>
                  </div>
                  <div className="flex-1 w-full bg-surface-container-low rounded-xl p-8">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-2xl w-3/4 text-sm shadow-sm">What's the Krebs Cycle?</div>
                      <div className="bg-primary/5 p-4 rounded-2xl w-[85%] ml-auto text-sm border border-primary/10">According to your lecture from Tuesday, it's a series of chemical reactions...</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-4">
                <div className="text-tertiary mb-8"><GraduationCap size={48} /></div>
                <h3 className="text-3xl font-bold mb-6">Smart Test Generator</h3>
                <p className="text-on-surface-variant leading-relaxed text-lg">Instantly create flashcards and mock exams from any document or PDF upload.</p>
              </Card>

              <Card className="md:col-span-4">
                <div className="text-secondary mb-8"><BarChart3 size={48} /></div>
                <h3 className="text-3xl font-bold mb-6">Weakness Analysis</h3>
                <p className="text-on-surface-variant leading-relaxed text-lg">Identify exactly which topics you're struggling with through visual heatmaps of your performance.</p>
              </Card>

              <Card className="md:col-span-8">
                <div className="flex flex-col lg:flex-row gap-12 items-center">
                  <div className="flex-1 order-2 lg:order-1 bg-surface-container-low rounded-xl h-48 flex items-center justify-center px-12">
                    <div className="w-full">
                      <div className="h-4 w-full bg-tertiary-container/30 rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary w-3/5 rounded-full"></div>
                      </div>
                      <div className="flex justify-between mt-4 text-sm font-black text-on-surface-variant uppercase tracking-widest">
                        <span>BIO 101</span>
                        <span>60% Complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 order-1 lg:order-2">
                    <div className="text-primary mb-8"><Calendar size={48} /></div>
                    <h3 className="text-3xl font-bold mb-6">Study Planner</h3>
                    <p className="text-on-surface-variant leading-relaxed text-lg">An adaptive schedule that adjusts based on your real-time progress and upcoming exam dates.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low py-20 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-2xl font-bold tracking-tighter text-primary font-headline">Axion</div>
          <p className="text-sm text-on-surface-variant font-medium">© 2024 Axion • The Digital Atelier for Students.</p>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
