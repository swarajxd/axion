import React from 'react';
import { cn } from '../../lib/utils';
import { FileText } from 'lucide-react';

interface NoteItemProps {
  name: string;
  size?: string;
  date?: string;
  className?: string;
}

export const NoteItem: React.FC<NoteItemProps> = ({ name, size, date, className }) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-5 bg-surface-container-low rounded-xl hover:translate-x-1 transition-transform cursor-pointer group",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-container/20 rounded-lg flex items-center justify-center">
          <FileText size={20} className="text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-on-surface-variant group-hover:text-primary transition-colors">{name}</h4>
          {(date || size) && (
            <p className="text-xs text-on-surface-variant/60 mt-1">
              {date}{date && size && " • "}{size}
            </p>
          )}
        </div>
      </div>
      <span className="px-3 py-1 bg-surface-container-highest text-[10px] font-bold tracking-widest rounded-full uppercase text-on-surface-variant">
        {name.split('.').pop()?.toUpperCase() || 'FILE'}
      </span>
    </div>
  );
};
