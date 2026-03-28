import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Calculator, FlaskConical, Flame, ArrowRight } from 'lucide-react';

interface RecentNote {
  title: string;
  updatedAt: string;
}

interface SubjectCardProps {
  subject: string;
  noteCount: number;
  icon: string;
  recentNotes: RecentNote[];
  href: string;
  className?: string;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ 
  subject, 
  noteCount, 
  icon, 
  recentNotes, 
  href,
  className 
}) => {
  const SubjectIcon = () => {
    switch (icon) {
      case 'flare':
        return <Flame size={28} className="text-primary" />;
      case 'science':
        return <FlaskConical size={28} className="text-primary" />;
      case 'calculate':
      default:
        return <Calculator size={28} className="text-primary" />;
    }
  };

  return (
    <div className={cn(
      "bg-surface-container-lowest rounded-xl p-10 card-shadow border border-outline-variant/10 flex flex-col min-h-[480px] transition-all hover:scale-[1.02]",
      className
    )}>
      <div className="flex justify-between items-start mb-10">
        <div className="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center">
          <SubjectIcon />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant/60">
          {noteCount.toString().padStart(2, '0')} Notes
        </span>
      </div>
      
      <h2 className="text-3xl font-semibold tracking-tight mb-8">{subject}</h2>
      
      <div className="flex-1 space-y-6">
        {recentNotes.map((note, idx) => (
          <div key={idx} className="group cursor-pointer">
            <h3 className="font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">
              {note.title}
            </h3>
            <p className="text-sm text-on-surface-variant/70 italic">
              Updated {note.updatedAt}
            </p>
          </div>
        ))}
      </div>
      
      <Link 
        to={href}
        className="mt-10 group flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs transition-all"
      >
        View Notes
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
};
