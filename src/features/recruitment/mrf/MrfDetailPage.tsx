import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fmtDate, TRACK_LABEL } from './format';
import { approveMrf, cancelMrf, getMrf, reviseMrf, submitMrf } from './mrfService';
import StatusBadge from './StatusBadge';
import type { Mrf } from './types';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className="mt-1 whitespace-pre-line text-sm text-slate-200">{children}</dd>
  </div>
);

export default function MrfDetailPage() {
  const id = Number(useParams().id);
  const [mrf, setMrf] = useState<Mrf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    getMrf(id).then(setMrf).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<Mrf>) => {
    setBusy(true);
    setError(null);
    try {
      setMrf(await fn());
      setComment('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aksi gagal.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !mrf) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        <Link to="/mrf" className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300">
          <ChevronLeft size={15} /> Daftar MRF
        </Link>
      </div>
    );
  }
  if (!mrf) return <div className="text-sm text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/mrf" className="flex w-fit items-center gap-1 text-sm text-brand-400 hover:text-brand-300">
          <ChevronLeft size={15} /> Daftar MRF
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-white">{mrf.position}</h1>
          <StatusBadge status={mrf.status} />
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">
          {mrf.code} · {mrf.division} · diajukan oleh {mrf.requester.name} ({mrf.requester.roleLabel})
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <dl className="card grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2"><Row label="Tanggung jawab utama">{mrf.responsibilities}</Row></div>
        <Row label="Pendidikan">{mrf.education}</Row>
        <Row label="Kemampuan">{mrf.skills}</Row>
        <div className="md:col-span-2"><Row label="Pengalaman">{mrf.experience}</Row></div>
        <Row label="Jumlah kebutuhan">{mrf.headcount} orang</Row>
        <Row label="Status kerja">{mrf.employmentStatus}</Row>
        <div className="md:col-span-2"><Row label="Jalur seleksi">{TRACK_LABEL[mrf.selectionTrack]}</Row></div>
      </dl>

      {mrf.canEdit && (
        <div className="card flex flex-wrap gap-2">
          <Link to={`/mrf/${mrf.id}/ubah`} className="btn-secondary">Ubah</Link>
          <button className="btn-primary" disabled={busy} onClick={() => void run(() => submitMrf(mrf.id))}>
            Ajukan
          </button>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={() => { if (window.confirm('Batalkan MRF ini?')) void run(() => cancelMrf(mrf.id)); }}
          >
            Batalkan
          </button>
        </div>
      )}

      {mrf.canDecide && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Keputusan Anda</h2>
          <div>
            <label className="field-label" htmlFor="comment">Catatan (wajib jika meminta revisi)</label>
            <textarea
              id="comment" rows={3} className="field-input"
              value={comment} onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => void run(() => approveMrf(mrf.id, comment))}>
              Setujui
            </button>
            <button
              className="btn-secondary"
              disabled={busy || comment.trim() === ''}
              onClick={() => void run(() => reviseMrf(mrf.id, comment))}
            >
              Minta revisi
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 font-semibold text-white">Riwayat</h2>
        {(mrf.history ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada riwayat.</p>
        ) : (
          <ol className="space-y-4 border-l-2 border-white/10 pl-5">
            {mrf.history!.map((h, i) => (
              <li key={i} className="relative text-sm">
                <div className="absolute -left-[21px] h-3 w-3 rounded-full border-2 border-slate-700 bg-slate-800" />
                <div className="font-medium text-slate-200">
                  {h.actionLabel} oleh {h.actorName}{' '}
                  <span className="font-normal text-slate-500">({h.roleLabel})</span>
                </div>
                <div className="text-xs text-slate-500">
                  {fmtDate(h.createdAt)} · menjadi &ldquo;{h.toLabel}&rdquo;
                </div>
                {h.comment && (
                  <div className="mt-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">
                    {h.comment}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
