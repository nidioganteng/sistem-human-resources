import { useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';

interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  blobUrl: string | null;
  title: string;
  filename?: string;
  loading?: boolean;
}

export function FileViewerModal({
  open, onClose, blobUrl, title, filename = 'berkas.pdf', loading = false,
}: FileViewerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-5 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {blobUrl && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Download size={13} /> Unduh
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Konten */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-sm text-slate-400">Memuat berkas...</p>
            </div>
          </div>
        )}
        {!loading && blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            className="h-full w-full border-0"
            title={title}
          />
        )}
        {!loading && !blobUrl && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">Berkas tidak dapat dimuat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
