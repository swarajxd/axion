import React from 'react';
import { SubjectCard } from '../components/notes/SubjectCard';
import { RecentNotesList } from '../components/notes/RecentNotesList';
import { UploadButton } from '../components/notes/UploadButton';

const SUBJECTS = [
  {
    subject: "Physics",
    noteCount: 12,
    icon: "flare",
    href: "/notes/physics",
    recentNotes: [
      { title: "Quantum Mechanics Fundamentals", updatedAt: "2 days ago" },
      { title: "Electromagnetic Wave Theory", updatedAt: "1 week ago" },
      { title: "Thermodynamics Lab Results", updatedAt: "Oct 24" }
    ]
  },
  {
    subject: "Chemistry",
    noteCount: 8,
    icon: "science",
    href: "/notes/chemistry",
    recentNotes: [
      { title: "Organic Synthesis Pathways", updatedAt: "4 days ago" },
      { title: "Molecular Orbital Theory", updatedAt: "Oct 28" }
    ]
  },
  {
    subject: "Mathematics",
    noteCount: 24,
    icon: "calculate",
    href: "/notes/mathematics",
    recentNotes: [
      { title: "Multivariable Calculus Integrals", updatedAt: "Today" },
      { title: "Linear Algebra & Vector Spaces", updatedAt: "3 days ago" },
      { title: "Differential Equations", updatedAt: "Oct 20" }
    ]
  }
];

const RECENT_FILES = [
  { name: "Calculus Review Sheet.pdf", size: "2.4 MB" },
  { name: "Chemical Bonding Notes.docx", size: "1.1 MB" }
];

const Notes: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto px-8 lg:px-20 py-10">
      <header className="mb-16">
        <h1 className="text-6xl text-editorial-display text-on-surface mb-4">Knowledge Repository</h1>
        <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
          Your curated library of academic notes. Organised by subject, refined for clarity, and crafted for deep retention.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {SUBJECTS.map((sub, idx) => (
          <SubjectCard key={idx} {...sub} />
        ))}
      </div>

      <RecentNotesList notes={RECENT_FILES} />
      
      <UploadButton placement="floating" />
    </div>
  );
};

export default Notes;
