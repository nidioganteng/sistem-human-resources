import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Modal } from '@/shared/ui/Modal';
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

const APPLICANT_BADGE: Partial<Record<string, 'default' | 'green' | 'red' | 'amber'>> = {
  new:            'amber',
  screen_rejected:'red',
  form_pending:   'amber',
  form_submitted: 'amber',
  shortlisted:    'green',
  hired:          'green',
  not_selected:   'red',
  declined:       'red',
  expired:        'red',
};

export default function VacancyDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!vacancy) return null;

  const newApplicants   = applicants.filter((a) => a.status === 'new');
  const otherApplicants = applicants.filter((a) => a.status !== 'new');

  return (
    <div className="space-y-5">
      <Link
        to="/lowongan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} /> Daftar Lowongan
      </Link>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{vacancy.position}</h1>
            <p className="page-subtitle mt-0.5">
              {vacancy.division} &middot; {vacancy.mrfCode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={vacancy.status === 'open' ? 'green' : 'default'}>
              {vacancy.status === 'open' ? 'Terbuka' : 'Ditutup'}
            </Badge>
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
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-500">{applyUrl}</span>
            <button className="btn-secondary flex shrink-0 items-center gap-1.5 !py-1.5 text-xs" onClick={handleCopy}>
              <Copy size={13} />
              {copied ? 'Disalin!' : 'Salin'}
            </button>
          </div>
        )}
      </div>

      {actionMsg && (
        <Alert variant={actionMsg.type === 'ok' ? 'success' : 'error'}>
          {actionMsg.text}
        </Alert>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Menunggu Screening ({newApplicants.length})
        </h2>
        <div className="card !p-0 overflow-hidden">
          {newApplicants.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title="Tidak ada pelamar baru"
              description="Pelamar baru akan muncul di sini setelah mendaftar."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {['Nama', 'Email', 'Nomor HP', 'Tanggal Daftar', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {newApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50">
                      <td className="td font-medium text-slate-900">{a.fullName}</td>
                      <td className="td text-slate-500">{a.email}</td>
                      <td className="td text-slate-500">{a.phone}</td>
                      <td className="td text-xs text-slate-400">
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
          )}
        </div>
      </div>

      {otherApplicants.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Riwayat Pelamar</h2>
          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {['Nama', 'Email', 'Status'].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otherApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50">
                      <td className="td font-medium text-slate-900">{a.fullName}</td>
                      <td className="td text-slate-500">{a.email}</td>
                      <td className="td">
                        <Badge variant={APPLICANT_BADGE[a.status] ?? 'default'}>
                          {APPLICANT_STATUS_LABELS[a.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Tutup Lowongan?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Tautan pendaftaran akan langsung tidak aktif. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Batal</button>
            <button className="btn-danger" onClick={() => void handleClose()}>Ya, Tutup</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
