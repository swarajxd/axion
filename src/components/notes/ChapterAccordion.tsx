import React, { useState } from 'react';
import { NoteItem } from './NoteItem';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface Note {
  name: string;
  date: string;
  size: string;
}

interface Chapter {
  id: string;
  name: string;
  notes: Note[];
}

interface ChapterAccordionProps {
  chapters: Chapter[];
}

export const ChapterAccordion: React.FC<ChapterAccordionProps> = ({ chapters }) => {
  const [openChapters, setOpenChapters] = useState<string[]>([chapters[0]?.id].filter(Boolean) as string[]);

  const toggleChapter = (id: string) => {
    setOpenChapters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {chapters.map((chapter) => {
        const isOpen = openChapters.includes(chapter.id);
        
        return (
          <div key={chapter.id} className="group">
            <button 
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center justify-between p-8 bg-surface-container-lowest rounded-lg transition-all hover:bg-surface-container shadow-[0px_4px_12px_rgba(83,68,57,0.04)]"
            >
              <div className="flex items-center gap-6">
                <ChevronDown
                  size={20}
                  className={cn(
                    'transition-transform duration-300',
                    isOpen ? 'text-primary rotate-0' : 'text-on-surface-variant/40 -rotate-90'
                  )}
                />
                <h3 className="text-xl font-semibold tracking-tight text-on-surface-variant">
                  {chapter.name}
                </h3>
              </div>
              <span className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-[0.08em]">
                {chapter.notes.length} Files
              </span>
            </button>
            
            {isOpen && (
              <div className="mt-4 ml-14 space-y-3">
                {chapter.notes.map((note, idx) => (
                  <NoteItem 
                    key={idx}
                    name={note.name}
                    date={note.date}
                    size={note.size}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
