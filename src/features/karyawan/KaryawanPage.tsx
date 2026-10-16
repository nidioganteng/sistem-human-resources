import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/services/api';
import { createEmployee, listEmployees } from './karyawanService';
import type { Employee } from './types';
import { EMPLOYMENT_STATUS_LABELS } from './types';

type Tab = 'PKWT' | 'PKWTT';

const STATUS_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Aktif',
  inactive: 'Tidak Aktif',
};

function statusBadge(status: string): string {
  if (status === 'active') return 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400';
  if (status === 'onboarding') return 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400';
  return 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700/60 dark:text-slate-400';
}

interface AddForm {
  fullName: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT';
  salary: string;
  contractStart: string;
  contractEnd: string;
}

const emptyForm: AddForm = {
  fullName: '',
  position: '',
  division: '',
  employmentStatus: 'PKWT',
  salary: '',
  contractStart: '',
  contractEnd: '',
};

export default function KaryawanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('PKWT');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user?.role === 'hr' || user?.role === 'super_admin';

  const load = async () => {
    try {
      setLoading(true);
      const res = await listEmployees();
      setEmployees(res.items);
    } catch {
      setError('Gagal memuat daftar karyawan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = employees.filter((e) => e.employmentStatus === activeTab);

  const handleAddSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.fullName.trim()) { setFormError('Nama lengkap wajib diisi.'); return; }
    if (!form.position.trim()) { setFormError('Posisi wajib diisi.'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      await createEmployee({
        fullName: form.fullName.trim(),
        position: form.position.trim(),
        division: form.division.trim(),
        employmentStatus: form.employmentStatus,
        salary: form.salary !== '' ? parseFloat(form.salary) : null,
        contractStart: form.contractStart !== '' ? form.contractStart : null,
        contractEnd: form.contractEnd !== '' ? form.contractEnd : null,
      });
      setShowModal(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Gagal menyimpan karyawan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">Memuat...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Karyawan</h1>
          <p className="page-subtitle">Database karyawan PKWT dan PKWTT Gaharu Sempana Group.</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Tambah Karyawan
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 w-fit">
        {(['PKWT', 'PKWTT'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {EMPLOYMENT_STATUS_LABELS[tab]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-slate-400 dark:text-slate-500 py-10">
          Belum ada karyawan {EMPLOYMENT_STATUS_LABELS[activeTab]}.
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 dark:border-white/10">
                <tr>
                  {['Nama', 'Posisi', 'Divisi', 'Status', 'Tanggal Mulai', ''].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="td font-medium text-slate-900 dark:text-slate-100">{e.fullName}</td>
                    <td className="td text-slate-600 dark:text-slate-300">{e.position}</td>
                    <td className="td text-slate-500 dark:text-slate-400">{e.division ?? '-'}</td>
                    <td className="td">
                      <span className={statusBadge(e.status)}>
                        {STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="td text-xs text-slate-400 dark:text-slate-500">
                      {e.contractStart
                        ? new Date(e.contractStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'}
                    </td>
                    <td className="td text-right">
                      <button
                        className="text-xs font-medium text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                        onClick={() => navigate(`/karyawan/${e.id}`)}
                      >
                        Lihat
                      </button>
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
          <div className="card w-full max-w-lg space-y-4 dark:!bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tambah Karyawan</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleAddSubmit(e)} className="space-y-3">
              <div>
                <label className="field-label">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  className="field-input"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Nama sesuai KTP"
                />
              </div>
              <div>
                <label className="field-label">Posisi <span className="text-red-500">*</span></label>
                <input
                  className="field-input"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="mis. Staff Arsitek"
                />
              </div>
              <div>
                <label className="field-label">Divisi</label>
                <input
                  className="field-input"
                  value={form.division}
                  onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                  placeholder="mis. Arsitektur"
                />
              </div>
              <div>
                <label className="field-label">Status Kepegawaian <span className="text-red-500">*</span></label>
                <select
                  className="field-input"
                  value={form.employmentStatus}
                  onChange={(e) => setForm((f) => ({ ...f, employmentStatus: e.target.value as 'PKWT' | 'PKWTT' }))}
                >
                  <option value="PKWT">Kontrak (PKWT)</option>
                  <option value="PKWTT">Tetap (PKWTT)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Gaji</label>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="mis. 5000000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Tanggal Mulai Kontrak</label>
                  <input
                    className="field-input"
                    type="date"
                    value={form.contractStart}
                    onChange={(e) => setForm((f) => ({ ...f, contractStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">Tanggal Selesai Kontrak</label>
                  <input
                    className="field-input"
                    type="date"
                    value={form.contractEnd}
                    onChange={(e) => setForm((f) => ({ ...f, contractEnd: e.target.value }))}
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
