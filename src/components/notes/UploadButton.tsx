import React, { useState } from 'react';
import { UploadModal } from './UploadModal';
import { Upload } from 'lucide-react';

export type UploadButtonPlacement = 'floating' | 'sidebar' | 'center';

interface UploadButtonProps {
  placement?: UploadButtonPlacement;
  onUploadSuccess?: () => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  placement = 'floating',
  onUploadSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const wrapperClass =
    placement === 'sidebar'
      ? 'fixed bottom-10 left-6 z-[80]'
      : placement === 'center'
        ? 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]'
        : 'fixed bottom-10 right-10 z-[60]';

  return (
    <>
      <div className={wrapperClass}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="
            bg-[#C1440E] hover:bg-[#A33B0C]
            text-white
            px-8 py-5 rounded-full
            flex items-center gap-3
            font-semibold
            shadow-[0px_24px_64px_rgba(163,61,35,0.35)]
            hover:scale-105 active:scale-95
            transition-all cursor-pointer
          "
        >
          <Upload size={20} className="text-white" />
          <span className="tracking-wide text-white">Upload Notes</span>
        </button>
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={onUploadSuccess}
      />
    </>
  );
};