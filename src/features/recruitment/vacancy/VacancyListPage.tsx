import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Alert } from '@/shared/ui/Alert';
import { Modal } from '@/shared/ui/Modal';
import { listVacancies, openVacancy } from './vacancyService';
import { listMrfs } from '@/features/recruitment/mrf/mrfService';
import type { Vacancy } from './types';
import type { Mrf } from '@/features/recruitment/mrf/types';
import { ApiError } from '@/services/api';

export default function VacancyListPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [mrfs, setMrfs] = useState<Mrf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [vacRes, mrfRes] = await Promise.all([listVacancies(), listMrfs()]);
      setVacancies(vacRes.items);
      const openMrfIds = new Set(
        vacRes.items.filter((v) => v.status === 'open').map((v) => v.mrfId),
      );
      setMrfs(mrfRes.items.filter((m) => !openMrfIds.has(m.id)));
    } catch {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleOpen = async (mrfId: number) => {
    setOpening(mrfId);
    setActionError('');
    try {
      await openVacancy(mrfId);
      setShowModal(false);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Gagal membuka lowongan.');
    } finally {
      setOpening(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Lowongan</h1>
          <p className="page-subtitle mt-0.5">Kelola lowongan pekerjaan yang aktif.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setShowModal(true); setActionError(''); }}
        >
          <Plus size={16} /> Buka Lowongan Baru
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {vacancies.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={24} />}
            title="Belum ada lowongan"
            description="Buka lowongan dari MRF yang sudah disetujui CEO."
            action={
              <button className="btn-primary" onClick={() => { setShowModal(true); setActionError(''); }}>
                <Plus size={15} /> Buka Lowongan Baru
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {['Posisi', 'Divisi', 'Status', 'Pelamar Baru', 'Total', 'MRF', ''].map((h, i) => (
                    <th key={i} className={`th ${h === 'Pelamar Baru' || h === 'Total' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacancies.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">{v.position}</td>
                    <td className="td text-slate-500">{v.division}</td>
                    <td className="td">
                      <Badge variant={v.status === 'open' ? 'green' : 'default'}>
                        {v.status === 'open' ? 'Terbuka' : 'Ditutup'}
                      </Badge>
                    </td>
                    <td className="td text-right">
                      {v.pendingCount > 0 ? (
                        <span className="font-bold text-brand-700">{v.pendingCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="td text-right text-slate-500">{v.totalCount}</td>
                    <td className="td font-mono text-xs text-slate-400">{v.mrfCode ?? '-'}</td>
                    <td className="td text-right">
                      <Link
                        to={`/lowongan/${v.id}`}
                        className="text-xs font-semibold text-brand-700 hover:text-brand-600"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Pilih MRF untuk Dibuka Lowongannya"
        size="md"
      >
        <div className="space-y-4">
          {actionError && <Alert variant="error">{actionError}</Alert>}

          {mrfs.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tidak ada MRF yang disetujui dan belum memiliki lowongan terbuka.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {mrfs.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.position}</p>
                    <p className="text-xs text-slate-400">{m.division} &middot; {m.code}</p>
                  </div>
                  <button
                    className="btn-primary !py-1.5 text-xs"
                    disabled={opening === m.id}
                    onClick={() => void handleOpen(m.id)}
                  >
                    {opening === m.id ? 'Membuka...' : 'Buka'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Tutup</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
