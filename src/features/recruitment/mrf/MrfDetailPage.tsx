import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ban, CheckCircle, Clock, Pencil, RefreshCw, Send, ServerOff, RotateCcw,
} from 'lucide-react';
import { StatusBadge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { fmtDate, TRACK_LABEL } from './format';
import { approveMrf, cancelMrf, getMrf, reviseMrf, submitMrf } from './mrfService';
import type { Mrf, MrfHistoryEntry } from './types';

const ICON_BG: Record<MrfHistoryEntry['action'], string> = {
  submit:  'bg-brand-100 text-brand-600',
  approve: 'bg-emerald-100 text-emerald-600',
  revise:  'bg-amber-100 text-amber-700',
  cancel:  'bg-red-100 text-red-600',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-100 px-6 py-5 last:border-0">
      <h3 className="mb-3 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function DtRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default function MrfDetailPage() {
  const id = Number(useParams().id);
  const [mrf, setMrf] = useState<Mrf | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    setFetchError(null);
    getMrf(id).then(setMrf).catch((e: Error) => setFetchError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<Mrf>) => {
    setBusy(true);
    setActionError(null);
    try {
      setMrf(await fn());
      setComment('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Aksi gagal.');
    } finally {
      setBusy(false);
    }
  };

  if (fetchError && !mrf) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ServerOff size={22} />
        </span>
        <p className="font-semibold text-slate-800">{fetchError}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={load}>
            <RefreshCw size={15} /> Coba lagi
          </button>
          <Link to="/mrf" className="btn-secondary">Daftar MRF</Link>
        </div>
      </div>
    );
  }

  if (!mrf) {
    return <div className="text-sm text-slate-400">Memuat...</div>;
  }

  const isManagerCreated = mrf.requester.role === 'manajer';

  return (
    <div className="space-y-5">
      <Link
        to="/mrf"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} /> Daftar MRF
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm tabular-nums text-slate-500">{mrf.code}</span>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{mrf.position}</h1>
            <StatusBadge status={mrf.status} />
          </div>
          <p className="text-sm text-slate-500">
            {mrf.division} · {mrf.headcount} orang · {mrf.employmentStatus} · diajukan oleh {mrf.requester.name} ({mrf.requester.roleLabel})
          </p>
        </div>

        <ApprovalStepper mrf={mrf} isManagerCreated={isManagerCreated} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="card !p-0 overflow-hidden">
          <Section title="Posisi">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DtRow label="Divisi">{mrf.division} ({mrf.divisionType})</DtRow>
              <DtRow label="Jumlah kebutuhan">{mrf.headcount} orang</DtRow>
              <DtRow label="Status kerja">{mrf.employmentStatus}</DtRow>
              <DtRow label="Jalur seleksi">{TRACK_LABEL[mrf.selectionTrack]}</DtRow>
            </dl>
          </Section>

          <Section title="Tanggung jawab">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{mrf.responsibilities}</p>
          </Section>

          <Section title="Kualifikasi">
            <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
              <dt className="text-slate-500">Pendidikan</dt>
              <dd className="text-slate-900">{mrf.education}</dd>
              <dt className="text-slate-500">Kemampuan</dt>
              <dd className="whitespace-pre-line text-slate-900">{mrf.skills}</dd>
              <dt className="text-slate-500">Pengalaman</dt>
              <dd className="text-slate-900">{mrf.experience}</dd>
            </dl>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <div className={`card flex flex-col gap-4 ${mrf.canDecide || mrf.canEdit ? 'border-brand-200' : ''}`}>
            <ActionPanel mrf={mrf} busy={busy} comment={comment} setComment={setComment} run={run} />
          </div>

          {actionError && <Alert variant="error">{actionError}</Alert>}

          <div className="card flex flex-col gap-4">
            <h3 className="font-semibold text-slate-900">Riwayat</h3>
            {(mrf.history ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada riwayat.</p>
            ) : (
              <ol className="flex flex-col">
                {mrf.history!.map((h, i) => (
                  <li key={i} className="grid grid-cols-[28px_1fr] gap-2.5">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${ICON_BG[h.action]}`}>
                        {h.action === 'submit' ? '→' : h.action === 'approve' ? '✓' : h.action === 'revise' ? '↩' : '✕'}
                      </span>
                      {i < mrf.history!.length - 1 && <span className="w-px flex-1 bg-slate-200 min-h-[12px] mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-slate-700">
                        <strong className="font-semibold text-slate-900">{h.actorName}</strong>
                        {' '}<span className="text-slate-500">· {h.roleLabel}</span>
                        <br />{h.actionLabel}
                      </p>
                      <time className="text-xs text-slate-400">{fmtDate(h.createdAt)}</time>
                      {h.comment && (
                        <div className="mt-1.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-slate-700 leading-relaxed">
                          {h.comment}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  mrf, busy, comment, setComment, run,
}: {
  mrf: Mrf;
  busy: boolean;
  comment: string;
  setComment: (v: string) => void;
  run: (fn: () => Promise<Mrf>) => Promise<void>;
}) {
  if (mrf.canEdit) {
    return (
      <>
        <div>
          <p className="font-semibold text-slate-900">Tindakan</p>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            {mrf.status === 'draft'
              ? 'Draft hanya terlihat oleh Anda. Ajukan untuk meneruskan ke proses persetujuan.'
              : 'Revisi diminta. Perbaiki dan ajukan kembali.'}
          </p>
        </div>
        <button className="btn-primary w-full" disabled={busy} onClick={() => void run(() => submitMrf(mrf.id))}>
          <Send size={15} /> Ajukan
        </button>
        <Link to={`/mrf/${mrf.id}/ubah`} className="btn-secondary w-full text-center">
          <Pencil size={15} /> Ubah
        </Link>
        <button
          className="btn-ghost w-full text-red-600 hover:bg-red-50"
          disabled={busy}
          onClick={() => { if (window.confirm('Batalkan MRF ini?')) void run(() => cancelMrf(mrf.id)); }}
        >
          <Ban size={15} /> Batalkan MRF
        </button>
      </>
    );
  }

  if (mrf.canDecide) {
    return (
      <>
        <div>
          <p className="font-semibold text-slate-900">Keputusan Anda</p>
          <p className="mt-1 text-sm text-slate-500">
            {mrf.requester.name} menunggu keputusan Anda.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="decision-comment">Catatan</label>
          <textarea
            id="decision-comment"
            rows={3}
            className="field-input"
            placeholder="Tulis alasan atau hal yang perlu diubah"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-slate-500">Wajib saat meminta revisi, opsional saat menyetujui.</p>
        </div>
        <button
          className="btn-primary w-full"
          disabled={busy}
          onClick={() => void run(() => approveMrf(mrf.id, comment))}
        >
          <CheckCircle size={15} /> Setujui
        </button>
        <button
          className="btn-danger-light w-full"
          disabled={busy || comment.trim() === ''}
          onClick={() => void run(() => reviseMrf(mrf.id, comment))}
        >
          <RotateCcw size={15} /> Minta revisi
        </button>
      </>
    );
  }

  if (mrf.status === 'approved') {
    return (
      <>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle size={18} />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Disetujui seluruhnya</p>
            <p className="text-sm text-slate-500">
              {mrf.history?.filter((h) => h.action === 'approve').at(-1)?.actorName ?? 'CEO'} menyetujui
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 leading-relaxed">
          Langkah berikutnya: <strong>HR membuka lowongan</strong> dari MRF ini.
        </div>
      </>
    );
  }

  if (mrf.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Ban size={18} />
        </span>
        <div>
          <p className="font-semibold text-slate-900">MRF dibatalkan</p>
          <p className="text-sm text-slate-500">MRF ini tidak lagi aktif.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock size={18} />
        </span>
        <div>
          <p className="font-semibold text-slate-900">
            {mrf.status === 'pending_manager' ? 'Menunggu persetujuan Manajer' : 'Menunggu persetujuan CEO'}
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Keputusan ada di tangan approver. Anda akan mendapat notifikasi saat keputusan diambil.
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 leading-relaxed">
        Anda tidak memiliki tindakan pada MRF ini saat ini.
      </div>
    </>
  );
}

function ApprovalStepper({ mrf, isManagerCreated }: { mrf: Mrf; isManagerCreated: boolean }) {
  type StepState = 'done' | 'active' | 'pending';
  const steps: Array<{ label: string; state: StepState }> = [];

  const isDone = (s: string) => {
    const order = ['draft', 'pending_manager', 'pending_ceo', 'approved'];
    const cur = order.indexOf(mrf.status);
    const target = order.indexOf(s);
    return target < cur || mrf.status === 'approved';
  };

  const isActive = (s: string) => mrf.status === s;

  if (!isManagerCreated) {
    steps.push({ label: 'Draft',    state: isDone('pending_manager') ? 'done' : isActive('draft') || isActive('revision') ? 'active' : 'pending' });
    steps.push({ label: 'Manajer', state: isDone('pending_ceo') ? 'done' : isActive('pending_manager') ? 'active' : 'pending' });
  } else {
    steps.push({ label: 'Draft',   state: isDone('pending_ceo') ? 'done' : isActive('draft') || isActive('revision') ? 'active' : 'pending' });
  }
  steps.push({ label: 'CEO',       state: mrf.status === 'approved' ? 'done' : isActive('pending_ceo') ? 'active' : 'pending' });
  steps.push({ label: 'Disetujui', state: mrf.status === 'approved' ? 'done' : 'pending' });

  const DOT: Record<StepState, string> = {
    done:   'bg-emerald-500 ring-4 ring-emerald-100',
    active: 'bg-brand-600 ring-4 ring-brand-100',
    pending:'bg-slate-200',
  };
  const LABEL: Record<StepState, string> = {
    done:   'text-emerald-700 font-semibold',
    active: 'text-brand-700 font-semibold',
    pending:'text-slate-400',
  };

  if (mrf.status === 'cancelled' || mrf.status === 'revision') return null;

  return (
    <ol className="hidden items-center rounded-xl border border-slate-200 bg-white px-5 py-3 lg:flex">
      {steps.map((s, i) => (
        <li key={i} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`h-3 w-3 rounded-full ${DOT[s.state]}`} />
            <span className={`text-[11px] ${LABEL[s.state]}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mb-4 h-0.5 flex-1 mx-1 ${s.state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
          )}
        </li>
      ))}
    </ol>
  );
}
