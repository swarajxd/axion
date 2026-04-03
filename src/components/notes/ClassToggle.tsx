import React from 'react';
import { useClass } from '../../context/ClassContext';

export const ClassToggle: React.FC = () => {
  const { classLevel, setClassLevel } = useClass();

  return (
    <div className="flex items-center gap-1 bg-surface-container-low rounded-full p-1">
      {(['11', '12'] as const).map((c) => (
        <button
          key={c}
          onClick={() => setClassLevel(c)}
          className={`
            px-5 py-2 rounded-full text-sm font-semibold transition-all
            ${classLevel === c
              ? 'bg-[#C1440E] text-white shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
            }
          `}
        >
          Class {c}
        </button>
      ))}
    </div>
  );
};