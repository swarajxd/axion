import React, { useCallback } from 'react';
import { SubjectCard } from '../components/notes/SubjectCard';
import { RecentNotesList } from '../components/notes/RecentNotesList';
import { UploadButton } from '../components/notes/UploadButton';
import { ClassToggle } from '../components/notes/ClassToggle';
import { useClass } from '../context/ClassContext';
import { useNotesSummary } from '../hooks/useNotesSummary';
import { formatDate, formatBytes } from '../services/notesApi';

const SUBJECT_META = [
  { subject: 'Physics',     icon: 'flare',     href: '/notes/physics'     },
  { subject: 'Chemistry',   icon: 'science',   href: '/notes/chemistry'   },
  { subject: 'Mathematics', icon: 'calculate', href: '/notes/mathematics' },
];

const Notes: React.FC = () => {
  const { classLevel } = useClass();
  const { summary, recent, loading, refetch } = useNotesSummary(classLevel);

  // Called by UploadModal on success so UI refreshes instantly
  const handleUploadSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="max-w-[1440px] mx-auto px-8 lg:px-20 py-10">

      {/* Header + Class Toggle */}
      <header className="mb-16 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h1 className="text-6xl text-editorial-display text-on-surface mb-4">
            Knowledge Repository
          </h1>
          <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
            Your curated library of academic notes. Organised by subject, refined for clarity,
            and crafted for deep retention.
          </p>
        </div>
        <div className="shrink-0 pt-2">
          <ClassToggle />
        </div>
      </header>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {SUBJECT_META.map(({ subject, icon, href }) => {
          const data = summary.find(s => s.subject === subject);
          const recentNotes = (data?.recent || []).map(n => ({
            title:     n.title,
            updatedAt: formatDate(n.created_at),
          }));

          return (
            <SubjectCard
              key={subject}
              subject={subject}
              icon={icon}
              href={href}
              noteCount={loading ? 0 : (data?.note_count || 0)}
              recentNotes={loading ? [] : recentNotes}
            />
          );
        })}
      </div>

      {/* Recently Accessed */}
      <RecentNotesList
        notes={recent.map(n => ({
          name: n.title,
          size: formatBytes(n.file_size),
        }))}
      />

      <UploadButton placement="floating" onUploadSuccess={handleUploadSuccess} />
    </div>
  );
};

export default Notes;