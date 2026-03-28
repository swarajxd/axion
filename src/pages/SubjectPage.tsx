import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChapterAccordion } from '../components/notes/ChapterAccordion';
import { UploadButton } from '../components/notes/UploadButton';
import { Bell, Search, User } from 'lucide-react';

const SUBJECT_DATA: Record<string, any> = {
  physics: {
    title: "Physics",
    chapters: [
      {
        id: "ch1",
        name: "Units & Measurements",
        notes: [
          { name: "Dimensional Analysis Deep Dive.pdf", date: "Oct 12, 2023", size: "4.2 MB" },
          { name: "Error Estimation and Propagation.pdf", date: "Oct 14, 2023", size: "2.8 MB" }
        ]
      },
      {
        id: "ch2",
        name: "Kinematics",
        notes: [
          { name: "Motion in One Dimension.pdf", date: "Nov 02, 2023", size: "3.1 MB" }
        ]
      },
      {
        id: "ch3",
        name: "Laws of Motion",
        notes: []
      },
      {
        id: "ch4",
        name: "Work, Energy, Power",
        notes: []
      }
    ]
  },
  chemistry: {
    title: "Chemistry",
    chapters: [
      {
        id: "ch1",
        name: "Atomic Structure",
        notes: []
      }
    ]
  },
  mathematics: {
    title: "Mathematics",
    chapters: [
      {
        id: "ch1",
        name: "Calculus",
        notes: []
      }
    ]
  }
};

const SubjectPage: React.FC = () => {
  const { subject } = useParams<{ subject: string }>();
  const data = SUBJECT_DATA[subject || 'physics'] || SUBJECT_DATA.physics;

  return (
    <div className="max-w-[1440px] mx-auto px-8 lg:px-20 py-10">
      <header className="mb-16 flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant/60 mb-4">
            <Link to="/notes" className="hover:text-primary transition-colors">Notes</Link>
            <span>/</span>
            <span className="text-on-surface-variant">{data.title}</span>
          </nav>
          <h1 className="text-5xl text-editorial-display text-primary mb-2">{data.title}</h1>
          <p className="text-on-surface-variant/70 text-lg">All your notes organized by chapters</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center bg-surface-container-high px-5 py-2.5 rounded-full w-80">
            <Search size={16} className="text-on-surface-variant/50 mr-2" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-on-surface-variant/40"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 hover:bg-surface-container-highest rounded-full transition-all text-on-surface-variant">
              <Bell size={18} />
            </button>
            <button className="p-2.5 hover:bg-surface-container-highest rounded-full transition-all text-on-surface-variant">
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto">
        <ChapterAccordion chapters={data.chapters} />
      </div>

      <UploadButton placement="center" />
    </div>
  );
};

export default SubjectPage;
