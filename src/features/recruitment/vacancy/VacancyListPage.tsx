import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Briefcase, Download, Plus } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Alert } from '@/shared/ui/Alert';
import { Modal } from '@/shared/ui/Modal';
import { downloadAndDeleteVacancy, listVacancies, openVacancy } from './vacancyService';
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
  const [downloadBusy, setDownloadBusy] = useState<number | null>(null);
  const [confirmDownload, setConfirmDownload] = useState<Vacancy | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  const handleDownloadAndDelete = async (vacancy: Vacancy) => {
    setDownloadBusy(vacancy.id);
    setConfirmDownload(null);
    setActionMsg(null);
    try {
      const safeName = vacancy.position.replace(/\s+/g, '_');
      const date     = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await downloadAndDeleteVacancy(vacancy.id, `arsip-${safeName}-${date}.zip`);
      setActionMsg({ type: 'ok', text: 'Arsip berhasil diunduh. Data lowongan dan pelamar telah dihapus dari server.' });
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal mengunduh arsip.' });
    } finally {
      setDownloadBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;

  const activeVacancies   = vacancies.filter((v) => v.status === 'open' || v.status === 'closed');
  const archivedVacancies = vacancies.filter((v) => v.status === 'archived');

  return (
    <div className="space-y-6">
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

      {actionMsg && (
        <Alert variant={actionMsg.type === 'ok' ? 'success' : 'error'}>
          {actionMsg.text}
        </Alert>
      )}

      {/* Seksi lowongan aktif dan ditutup */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Aktif &amp; Ditutup</h2>
        <div className="card !p-0 overflow-hidden">
          {activeVacancies.length === 0 ? (
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
                  {activeVacancies.map((v) => (
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
      </div>

      {/* Seksi arsip */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Archive size={15} /> Arsip
        </h2>
        <div className="card !p-0 overflow-hidden">
          {archivedVacancies.length === 0 ? (
            <EmptyState
              icon={<Archive size={22} />}
              title="Belum ada arsip"
              description="Lowongan yang diarsipkan akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {['Posisi', 'Divisi', 'MRF', 'Total Pelamar', ''].map((h, i) => (
                      <th key={i} className={`th ${h === 'Total Pelamar' ? 'text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archivedVacancies.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-slate-50">
                      <td className="td font-medium text-slate-900">{v.position}</td>
                      <td className="td text-slate-500">{v.division}</td>
                      <td className="td font-mono text-xs text-slate-400">{v.mrfCode ?? '-'}</td>
                      <td className="td text-right text-slate-500">{v.totalCount}</td>
                      <td className="td text-right">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
                          disabled={downloadBusy === v.id}
                          onClick={() => setConfirmDownload(v)}
                        >
                          <Download size={13} />
                          {downloadBusy === v.id ? 'Mengunduh...' : 'Unduh & Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal buka lowongan baru */}
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

      {/* Modal konfirmasi unduh + hapus dari halaman arsip */}
      <Modal
        open={confirmDownload !== null}
        onClose={() => setConfirmDownload(null)}
        title="Unduh & Hapus Data?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Semua data pelamar <strong className="text-slate-700">{confirmDownload?.position}</strong> (CSV + berkas CV dan portofolio)
            akan dikemas dalam satu file ZIP dan diunduh. Setelah unduhan selesai,{' '}
            <strong className="text-slate-700">seluruh data pelamar dan lowongan ini akan dihapus permanen dari server</strong>.
            Pastikan file ZIP berhasil tersimpan sebelum melanjutkan.
          </p>
          <p className="text-xs text-amber-600">Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDownload(null)}>Batal</button>
            <button
              className="!bg-amber-500 hover:!bg-amber-600 !text-white btn-primary"
              disabled={confirmDownload !== null && downloadBusy === confirmDownload.id}
              onClick={() => { if (confirmDownload) void handleDownloadAndDelete(confirmDownload); }}
            >
              Ya, Unduh &amp; Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
