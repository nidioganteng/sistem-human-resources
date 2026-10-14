import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, X } from 'lucide-react';
import {
  approveApplicant,
  closeVacancy,
  getVacancy,
  listApplicants,
  rejectApplicant,
} from './vacancyService';
import { APPLICANT_STATUS_LABELS } from './types';
import type { Applicant, Vacancy } from './types';
import { ApiError } from '@/services/api';

export default function VacancyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | 'close' | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);

  const vacancyId = Number(id);

  const load = async () => {
    try {
      setLoading(true);
      const [vac, appRes] = await Promise.all([getVacancy(vacancyId), listApplicants(vacancyId)]);
      setVacancy(vac);
      setApplicants(appRes.items);
    } catch {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [vacancyId]);

  const applyUrl = vacancy ? `${window.location.origin}/daftar/${vacancy.publicToken}` : '';

  const handleCopy = () => {
    void navigator.clipboard.writeText(applyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApprove = async (applicant: Applicant) => {
    setBusy(applicant.id);
    setActionMsg(null);
    try {
      await approveApplicant(applicant.id, window.location.origin);
      setActionMsg({ type: 'ok', text: `Email tautan Form Pelamar telah dikirim ke ${applicant.email}.` });
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menyetujui.' });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (applicant: Applicant) => {
    if (!window.confirm(`Tolak lamaran ${applicant.fullName}? Data pelamar akan dihapus permanen.`)) return;
    setBusy(applicant.id);
    setActionMsg(null);
    try {
      await rejectApplicant(applicant.id);
      setActionMsg({ type: 'ok', text: `Lamaran ${applicant.fullName} ditolak. Email penolakan dikirim.` });
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menolak.' });
    } finally {
      setBusy(null);
    }
  };

  const handleClose = async () => {
    setBusy('close');
    setConfirmClose(false);
    try {
      const updated = await closeVacancy(vacancyId);
      setVacancy(updated);
      setActionMsg({ type: 'ok', text: 'Lowongan berhasil ditutup.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menutup lowongan.' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">Memuat...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!vacancy) return null;

  const newApplicants   = applicants.filter((a) => a.status === 'new');
  const otherApplicants = applicants.filter((a) => a.status !== 'new');

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/lowongan')}
        className="flex items-center gap-1 text-sm text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
      >
        <ChevronLeft size={15} /> Kembali
      </button>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              {vacancy.position}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {vacancy.division} &middot; {vacancy.mrfCode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
              vacancy.status === 'open'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
            }`}>
              {vacancy.status === 'open' ? 'Terbuka' : 'Ditutup'}
            </span>
            {vacancy.status === 'open' && (
              <button
                className="btn-danger !py-1.5 text-xs"
                disabled={busy === 'close'}
                onClick={() => setConfirmClose(true)}
              >
                {busy === 'close' ? 'Menutup...' : 'Tutup Lowongan'}
              </button>
            )}
          </div>
        </div>

        {vacancy.status === 'open' && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
              {applyUrl}
            </span>
            <button
              className="btn-secondary flex shrink-0 items-center gap-1.5 !py-1.5 text-xs"
              onClick={handleCopy}
            >
              <Copy size={13} />
              {copied ? 'Disalin!' : 'Salin'}
            </button>
          </div>
        )}
      </div>

      {actionMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          actionMsg.type === 'ok'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400'
            : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
        }`}>
          {actionMsg.text}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Menunggu Screening ({newApplicants.length})
        </h2>
        {newApplicants.length === 0 ? (
          <div className="card text-sm text-slate-400 dark:text-slate-500">Tidak ada pelamar baru.</div>
        ) : (
          <div className="card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 dark:border-white/10">
                  <tr>
                    {['Nama', 'Email', 'Nomor HP', 'Tanggal Daftar', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {newApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="td font-medium text-slate-900 dark:text-slate-100">{a.fullName}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.email}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.phone}</td>
                      <td className="td text-xs text-slate-400 dark:text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="btn-primary !py-1.5 text-xs"
                            disabled={busy === a.id}
                            onClick={() => void handleApprove(a)}
                          >
                            {busy === a.id ? '...' : 'Setujui'}
                          </button>
                          <button
                            className="btn-danger !py-1.5 text-xs"
                            disabled={busy === a.id}
                            onClick={() => void handleReject(a)}
                          >
                            {busy === a.id ? '...' : 'Tolak'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {otherApplicants.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Riwayat Pelamar</h2>
          <div className="card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 dark:border-white/10">
                  <tr>
                    {['Nama', 'Email', 'Status'].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {otherApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="td font-medium text-slate-900 dark:text-slate-100">{a.fullName}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.email}</td>
                      <td className="td">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                          {APPLICANT_STATUS_LABELS[a.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm space-y-4 dark:!bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tutup Lowongan?</h2>
              <button
                onClick={() => setConfirmClose(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tautan pendaftaran akan langsung tidak aktif. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Batal</button>
              <button className="btn-danger" onClick={() => void handleClose()}>Ya, Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
