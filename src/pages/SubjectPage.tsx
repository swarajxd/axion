  import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, FlaskConical, Flame, BookOpen } from 'lucide-react';
import { ChapterAccordion } from '../components/notes/ChapterAccordion';
import { ClassToggle } from '../components/notes/ClassToggle';
import { UploadButton } from '../components/notes/UploadButton';
import { useClass } from '../context/ClassContext';
import { useNotes } from '../hooks/useNotes';
import { formatDate, formatBytes } from '../services/notesApi';

// Map URL slug → display name + icon
const SUBJECT_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  physics: {
    label: 'Physics',
    icon: <Flame size={32} className="text-primary" />,
  },
  chemistry: {
    label: 'Chemistry',
    icon: <FlaskConical size={32} className="text-primary" />,
  },
  mathematics: {
    label: 'Mathematics',
    icon: <Calculator size={32} className="text-primary" />,
  },
};

const SubjectPage: React.FC = () => {
  const { subject = 'physics' } = useParams<{ subject: string }>();
  const { classLevel } = useClass();
  const config = SUBJECT_CONFIG[subject.toLowerCase()] ?? SUBJECT_CONFIG.physics;

  const { data, loading, error, refetch } = useNotes(config.label, classLevel);

  const handleUploadSuccess = useCallback(() => refetch(), [refetch]);

  // Map backend chapter data → ChapterAccordion shape
  const chapters = (data?.chapters || []).map((ch) => ({
    id:    ch.name,
    name:  ch.name,
    notes: ch.notes.map(n => ({
      name: n.title,
      date: formatDate(n.created_at),
      size: formatBytes(n.file_size),
      url:  n.file_url,
    })),
  }));

  const totalNotes = chapters.reduce((sum, chapter) => sum + chapter.notes.length, 0);

  return (
    <div className="max-w-[1440px] mx-auto px-8 lg:px-20 py-10">

      {/* Header */}
      <header className="mb-16 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center">
              {config.icon}
            </div>
            <h1 className="text-5xl text-editorial-display text-on-surface">
              {config.label}
            </h1>
          </div>
          <p className="text-on-surface-variant text-lg">
            Class {classLevel} · {totalNotes} notes across {chapters.length} chapters
          </p>
        </div>
        <div className="shrink-0 pt-2">
          <ClassToggle />
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Failed to load notes: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && chapters.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
            <BookOpen size={36} className="text-on-surface-variant/40" />
          </div>
          <div>
            <p className="text-xl font-semibold text-on-surface mb-2">No chapters yet</p>
            <p className="text-on-surface-variant max-w-sm">
              Upload your first {config.label} notes and they'll appear here,
              organised by NCERT chapter automatically.
            </p>
          </div>
        </div>
      )}

      {/* Chapter accordion */}
      {!loading && !error && chapters.length > 0 && (
        <ChapterAccordion chapters={chapters} />
      )}

      <UploadButton placement="floating" onUploadSuccess={handleUploadSuccess} />
    </div>
  );
};

export default SubjectPage;