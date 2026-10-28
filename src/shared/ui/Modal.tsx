import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
const SIZE = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };
const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter((el) => el.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`card glow-panel relative max-h-[90dvh] w-full ${SIZE[size]} overflow-y-auto !p-0 shadow-modal outline-none`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="icon-button !h-8 !w-8" aria-label="Tutup dialog"><X size={17} /></button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>, document.body
  );
}
