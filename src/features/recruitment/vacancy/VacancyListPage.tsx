import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Lowongan</h1>
          <p className="mt-0.5 text-sm text-slate-400">Kelola lowongan pekerjaan yang aktif.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowModal(true); setActionError(''); }}>
          <Plus size={16} /> Buka Lowongan Baru
        </button>
      </div>

      {vacancies.length === 0 ? (
        <div className="card text-sm text-slate-500">Belum ada lowongan.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {['Posisi', 'Divisi', 'Status', 'Pelamar Baru', 'Total', 'MRF', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${h === 'Pelamar Baru' || h === 'Total' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vacancies.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-200">{v.position}</td>
                    <td className="px-4 py-3 text-slate-400">{v.division}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        v.status === 'open'
                          ? 'bg-emerald-400/15 text-emerald-400'
                          : 'bg-slate-700/60 text-slate-400'
                      }`}>
                        {v.status === 'open' ? 'Terbuka' : 'Ditutup'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.pendingCount > 0 ? (
                        <span className="font-bold text-brand-400">{v.pendingCount}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{v.totalCount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.mrfCode ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/lowongan/${v.id}`} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Pilih MRF untuk Dibuka Lowongannya</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                {actionError}
              </div>
            )}

            {mrfs.length === 0 ? (
              <p className="text-sm text-slate-400">
                Tidak ada MRF yang disetujui dan belum memiliki lowongan terbuka.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10">
                {mrfs.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">{m.position}</div>
                      <div className="text-xs text-slate-500">{m.division} &middot; {m.code}</div>
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
        </div>
      )}
    </div>
  );
}
