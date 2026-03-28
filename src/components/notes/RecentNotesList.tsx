import React from 'react';
import { NoteItem } from './NoteItem';

interface RecentNote {
  name: string;
  size: string;
}

interface RecentNotesListProps {
  notes: RecentNote[];
}

export const RecentNotesList: React.FC<RecentNotesListProps> = ({ notes }) => {
  return (
    <section className="mt-24">
      <h2 className="text-2xl font-semibold tracking-tight mb-8">Recently Accessed</h2>
      <div className="bg-surface-container-low rounded-lg p-8">
        <div className="flex flex-col gap-4">
          {notes.map((note, idx) => (
            <NoteItem 
              key={idx} 
              name={note.name} 
              size={note.size} 
              className="bg-surface-container-lowest"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
