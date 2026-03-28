import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface ClassificationResult {
  class: string;
  subject: string;
  chapter: string;
  confidence: number;
  text_preview: string;
  char_count: number;
  error?: string;
}

const BACKEND_URL = 'http://localhost:8000';
const ACCEPTED = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
const MAX_MB = 50;

/* ─────────────────────────────────────────────────────────────
   Shared button styles — solid orange so text is ALWAYS visible
───────────────────────────────────────────────────────────── */
const primaryBtn =
  'bg-[#C1440E] hover:bg-[#A33B0C] text-white font-semibold rounded-full ' +
  'shadow-[0px_8px_24px_rgba(163,61,35,0.35)] active:scale-[0.98] ' +
  'transition-all flex items-center justify-center gap-2';

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging]       = useState(false);
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [status, setStatus]               = useState<UploadStatus>('idle');
  const [result, setResult]               = useState<ClassificationResult | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setErrorMsg(`Unsupported type "${ext}". Accepted: PDF, JPG, PNG and other images.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`File too large. Maximum is ${MAX_MB} MB.`);
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setErrorMsg(null);
    setIsBackendDown(false);
    setStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setStatus('uploading');
    setResult(null);
    setErrorMsg(null);
    setIsBackendDown(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res  = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      const data: ClassificationResult = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? `Server responded with status ${res.status}`);
        setStatus('error');
        return;
      }
      setResult(data);
      setStatus('success');
    } catch {
      setIsBackendDown(true);
      setStatus('error');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
    setIsBackendDown(false);
    setStatus('idle');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-xl rounded-2xl shadow-[0px_24px_64px_rgba(83,68,57,0.14)] overflow-hidden relative z-[201] max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8 md:p-10 space-y-6">

              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-3xl font-light tracking-[-0.04em] text-gray-900">Upload Notes</h2>
                <p className="text-gray-500 leading-relaxed text-sm">
                  Drop your academic papers or lecture notes here. Our AI will automatically categorize them.
                </p>
              </div>

              {/* Backend down banner */}
              {isBackendDown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200"
                >
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-800">Backend server not running</p>
                    <p className="text-xs text-amber-700">Start it with:</p>
                    <code className="block text-xs bg-amber-100 text-amber-900 px-3 py-2 rounded-lg font-mono">
                      cd backend &amp;&amp; uvicorn main:app --reload --port 8000
                    </code>
                  </div>
                </motion.div>
              )}

              {/* Validation / server error */}
              {errorMsg && !isBackendDown && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                  <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

              {/* Drop zone */}
              {status !== 'success' && (
                <div
                  className="group relative"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-52 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      isDragging
                        ? 'border-[#C1440E] bg-orange-50'
                        : selectedFile
                          ? 'border-[#C1440E]/60 bg-orange-50/50'
                          : 'border-gray-200 hover:border-[#C1440E]/40 hover:bg-orange-50/30 bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center px-8 gap-3">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-gray-100">
                        <UploadCloud size={26} className="text-[#C1440E]" />
                      </div>
                      {selectedFile ? (
                        <>
                          <p className="text-base font-semibold text-gray-800 break-all">{selectedFile.name}</p>
                          <p className="text-sm text-gray-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-semibold text-gray-700">Select a file or drag and drop</p>
                          <p className="text-sm text-gray-400">PDF, JPG, PNG (max. {MAX_MB} MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      className="hidden"
                      id="file-upload"
                      type="file"
                      accept={ACCEPTED.join(',')}
                      onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}

              {/* Result card */}
              {status === 'success' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <CheckCircle size={18} className="text-green-500" />
                    <span className="text-sm font-semibold text-gray-800">Classified successfully</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    {[
                      { label: 'Subject', value: result.subject },
                      { label: 'Class',   value: `Class ${result.class}` },
                      { label: 'Chapter', value: result.chapter },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-4 py-4">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{value}</p>
                      </div>
                    ))}
                  </div>
                  {result.text_preview && (
                    <div className="px-5 py-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Text preview</p>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{result.text_preview}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Action buttons ── */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-8 py-3.5 text-gray-500 font-medium hover:text-gray-800 transition-colors rounded-full"
                >
                  Cancel
                </button>

                {status === 'success' ? (
                  <button
                    onClick={handleClose}
                    className={`w-full sm:w-auto px-10 py-3.5 ${primaryBtn}`}
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || status === 'uploading'}
                    className={`w-full sm:w-auto px-10 py-3.5 min-w-[130px] ${primaryBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {status === 'uploading' ? (
                      <>
                        <Loader2 size={17} className="animate-spin text-white" />
                        <span className="text-white">Analysing…</span>
                      </>
                    ) : (
                      <span className="text-white">Upload</span>
                    )}
                  </button>
                )}
              </div>

            </div>
            <div className="h-1.5 w-full bg-gray-100" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};