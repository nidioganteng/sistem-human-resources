import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, RefreshCw, X } from 'lucide-react';
import { apiFetchBlob } from '@/services/api';
import { Alert } from '@/shared/ui/Alert';
import { Badge } from '@/shared/ui/Badge';
import { APPLICANT_STATUS_LABELS, type Applicant } from './types';

type FileKind = 'cv' | 'portfolio' | 'certificate';
const FILES: { kind: FileKind; label: string; available: keyof Applicant }[] = [
  { kind: 'cv', label: 'Curriculum Vitae (CV)', available: 'hasCv' },
  { kind: 'portfolio', label: 'Portofolio', available: 'hasPortfolio' },
  { kind: 'certificate', label: 'Sertifikat', available: 'hasCertificate' },
];

interface Props {
  applicant: Applicant;
  canScreen: boolean;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function ApplicantReviewPanel({ applicant, canScreen, busy, onClose, onApprove, onReject }: Props) {
  const files = FILES.filter(file => applicant[file.available]);
  const [active, setActive] = useState<FileKind | null>(files[0]?.kind ?? null);
  const [preview, setPreview] = useState<{ kind: FileKind; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let url: string | null = null;
    setPreview(null);
    setError('');
    setLoading(true);
    apiFetchBlob(`/applicants/${applicant.id}/file/${active}`)
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ kind: active, url });
      })
      .catch(() => {
        if (!cancelled) setError('Berkas belum dapat dimuat. Coba lagi atau pilih dokumen lain.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [active, applicant.id, retry]);

  const currentFile = files.find(file => file.kind === active);
  const previewUrl = preview?.kind === active ? preview.url : null;

  return (
    <section ref={panel} tabIndex={-1} aria-labelledby="applicant-review-title" className="card scroll-mt-6 space-y-5 focus:outline-none">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-caption">Review lamaran</p>
          <h2 id="applicant-review-title" className="mt-1 break-words text-xl font-semibold text-ink">{applicant.fullName}</h2>
          <div className="mt-2"><Badge>{APPLICANT_STATUS_LABELS[applicant.status]}</Badge></div>
        </div>
        <button type="button" className="icon-button shrink-0" onClick={onClose} disabled={busy} aria-label="Tutup detail pelamar"><X size={18}/></button>
      </div>

      <dl className="grid gap-4 rounded-xl bg-subtle p-4 sm:grid-cols-3">
        <div className="min-w-0"><dt className="text-xs text-caption">Email</dt><dd className="mt-1 break-all text-sm text-body">{applicant.email}</dd></div>
        <div><dt className="text-xs text-caption">Nomor HP</dt><dd className="mt-1 text-sm text-body">{applicant.phone}</dd></div>
        <div><dt className="text-xs text-caption">Tanggal daftar</dt><dd className="mt-1 text-sm text-body">{new Date(applicant.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
      </dl>
      {applicant.message && <div className="space-y-1"><h3 className="text-xs font-semibold uppercase tracking-wider text-caption">Pesan dari pelamar</h3><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-body">{applicant.message}</p></div>}

      <div className="space-y-3">
        <div><h3 className="text-sm font-semibold text-ink">Berkas lamaran</h3><p className="mt-1 text-xs text-caption">Pilih dokumen untuk melihat pratinjau di bawah.</p></div>
        {files.length ? <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih berkas lamaran">
            {files.map(file => <button key={file.kind} type="button" aria-pressed={active === file.kind} onClick={() => setActive(file.kind)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active === file.kind ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel text-body hover:bg-subtle'}`}><FileText size={16}/>{file.label}</button>)}
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-subtle">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
              <p className="text-sm font-medium text-body">{currentFile?.label} <span className="ml-1 text-xs text-caption">PDF</span></p>
              {previewUrl && <div className="flex flex-wrap gap-3 text-xs font-semibold text-accent">
                <a className="inline-flex min-h-9 items-center gap-1.5 hover:underline" href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Buka tab baru</a>
                <a className="inline-flex min-h-9 items-center gap-1.5 hover:underline" href={previewUrl} download={`${active}-${applicant.fullName.replace(/\s+/g, '_')}.pdf`}><Download size={14}/>Unduh</a>
              </div>}
            </div>
            <div aria-busy={loading}>
              {loading && <p role="status" className="px-4 py-16 text-center text-sm text-caption">Memuat pratinjau berkas...</p>}
              {error && <div className="space-y-3 p-4"><Alert variant="error">{error}</Alert><button type="button" className="btn-secondary" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15}/>Coba lagi</button></div>}
              {!loading && !error && previewUrl && <iframe src={previewUrl} title={`${currentFile?.label} — ${applicant.fullName}`} className="h-[65vh] min-h-[360px] max-h-[850px] w-full border-0 bg-white"/>}
            </div>
          </div>
          {previewUrl && <p className="text-xs text-caption">Jika pratinjau tidak tampil di browser, pilih Buka tab baru atau Unduh.</p>}
        </> : <p className="rounded-xl bg-subtle p-4 text-sm text-caption">Tidak ada berkas tersedia.</p>}
      </div>

      {canScreen && applicant.status === 'new' && <div className="flex flex-col-reverse justify-end gap-2 border-t border-line pt-4 sm:flex-row">
        <button type="button" className="btn-danger-light" disabled={busy} onClick={onReject}>Tolak Lamaran</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={onApprove}>{busy ? 'Memproses...' : 'Setujui & Kirim Form'}</button>
      </div>}
    </section>
  );
}
