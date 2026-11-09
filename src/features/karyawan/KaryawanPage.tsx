import { useDeferredValue, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, FileCheck2, Plus, Search, Users } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { ApiError, apiFetchBlob } from '@/services/api';
import { createEmployee, listEmployees } from './karyawanService';
import type { Employee } from './types';
import { EMPLOYMENT_STATUS_LABELS } from './types';
import { Modal } from '@/shared/ui/Modal';
import { filterEmployees } from './directory';
import { RupiahInput } from '@/shared/ui/RupiahInput';

type Tab = 'all' | Employee['employmentStatus'];
const REQUIRED_DOCS = ['ktp', 'kk', 'npwp', 'bpjs', 'ijazah', 'foto'];

function EmployeePhoto({ employee, allowed }: { employee: Employee; allowed: boolean }) {
  const [url, setUrl] = useState('');
  const hasPhoto = employee.documents.some(doc => doc.docType === 'foto');
  useEffect(() => {
    if (!allowed || !hasPhoto) return;
    let disposed = false;
    let objectUrl = '';
    void apiFetchBlob(`/employees/${employee.id}/documents/foto`).then(blob => {
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { /* The profile remains usable when a photo is unavailable. */ });
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [employee.id, hasPhoto, allowed]);
  return <div className="employee-avatar">{url ? <img src={url} alt={`Pasfoto ${employee.fullName}`} className="h-full w-full object-cover" onError={() => setUrl('')} /> : <Users size={22} aria-hidden="true" />}</div>;
}

const STATUS_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Aktif',
  inactive: 'Tidak Aktif',
};

function statusBadge(status: string): string {
  if (status === 'active') return 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400';
  if (status === 'onboarding') return 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400';
  return 'rounded-full bg-subtle px-2.5 py-0.5 text-xs font-semibold text-caption';
}

interface AddForm {
  fullName: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT' | 'FREELANCE';
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
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<Employee['status'] | 'all'>('all');
  const [division, setDivision] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user?.role === 'hr' || user?.role === 'super_admin';

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await listEmployees();
      setEmployees(res.items);
    } catch {
      setError('Gagal memuat daftar karyawan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = filterEmployees(employees, { search: deferredSearch, employment: activeTab, status, division });
  const divisions = [...new Set(employees.map(e => e.division).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'id'));
  const resetFilters = () => { setSearch(''); setActiveTab('all'); setStatus('all'); setDivision(''); };

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

  return (
    <div className="employee-directory space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Database Karyawan</h1>
          <p className="page-subtitle">Kenali tim, kelola profil, dan pantau kelengkapan data karyawan.</p>
        </div>
        {canCreate && <button className="btn-primary employee-primary" onClick={() => setShowModal(true)}><Plus size={17} aria-hidden="true" />Tambah Karyawan</button>}
      </header>

      <div className="employee-toolbar">
        <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Jenis kepegawaian">
          {(['all', 'PKWT', 'PKWTT', 'FREELANCE'] as Tab[]).map(tab => <button key={tab} type="button" aria-pressed={activeTab === tab} className={`employee-filter ${activeTab === tab ? 'is-selected' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'all' ? 'Semua' : tab === 'FREELANCE' ? 'Freelance' : tab}
            <span className="employee-filter-count">{tab === 'all' ? employees.length : employees.filter(e => e.employmentStatus === tab).length}</span>
          </button>)}
        </div>
        <div className="relative w-full xl:max-w-xs">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-caption" aria-hidden="true" />
          <input type="search" aria-label="Cari karyawan berdasarkan nama, jabatan, atau divisi" placeholder="Cari nama, jabatan, atau divisi..." className="field-input !rounded-xl !bg-panel !pl-10" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-caption" role="status">{loading ? 'Memuat direktori...' : `${filtered.length} karyawan ditampilkan`}</p>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="employee-division">Filter divisi</label>
          <select id="employee-division" className="field-input !w-auto min-w-0 flex-1 !py-2.5 sm:flex-none" value={division} onChange={event => setDivision(event.target.value)}>
            <option value="">Semua divisi</option>{divisions.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <label className="sr-only" htmlFor="employee-status">Filter status</label>
          <select id="employee-status" className="field-input !w-auto min-w-0 flex-1 !py-2.5 sm:flex-none" value={status} onChange={event => setStatus(event.target.value as Employee['status'] | 'all')}>
            <option value="all">Semua status</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {error ? <div className="card space-y-3" role="alert"><p className="text-sm text-red-600 dark:text-red-400">{error}</p><button className="btn-secondary" onClick={() => void load()}>Coba lagi</button></div>
      : loading ? <div className="employee-grid" aria-busy="true" aria-label="Memuat daftar karyawan">{Array.from({ length: 6 }, (_, index) => <div key={index} className="employee-card h-72 motion-safe:animate-pulse"><div className="h-12 w-12 rounded-xl bg-subtle" /><div className="mt-5 h-4 w-2/3 rounded bg-subtle" /><div className="mt-3 h-4 w-1/2 rounded bg-subtle" /><div className="mt-8 h-11 rounded-xl bg-subtle" /></div>)}</div>
      : !filtered.length ? <div className="card flex flex-col items-center gap-3 py-14 text-center"><Users size={30} className="text-caption" aria-hidden="true" /><h2 className="font-semibold text-ink">{employees.length ? 'Karyawan tidak ditemukan' : 'Belum ada karyawan'}</h2><p className="max-w-sm text-sm text-caption">{employees.length ? 'Coba kata kunci lain atau sesuaikan filter untuk menemukan karyawan.' : 'Tambahkan karyawan untuk mulai mengelola data tim Anda.'}</p>{employees.length > 0 && <button className="btn-secondary" onClick={resetFilters}>Reset filter</button>}</div>
      : <div className="employee-grid">{filtered.map(employee => {
        const complete = REQUIRED_DOCS.filter(type => employee.documents.some(doc => doc.docType === type)).length;
        const full = complete === REQUIRED_DOCS.length;
        return <article className="employee-card" key={employee.id} aria-labelledby={`employee-name-${employee.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <EmployeePhoto employee={employee} allowed={canCreate} />
              <div className="min-w-0"><h2 id={`employee-name-${employee.id}`} className="break-words text-sm font-semibold leading-snug text-ink">{employee.fullName}</h2><p className="mt-1 break-words text-xs leading-relaxed text-caption">{employee.position}</p></div>
            </div>
            <span className={`${statusBadge(employee.status)} inline-flex shrink-0 items-center gap-1 whitespace-nowrap !rounded-md !px-2 !py-1 !text-[11px]`}>{employee.status === 'active' && <Check size={12} aria-hidden="true" />}{STATUS_LABELS[employee.status]}</span>
          </div>
          <dl className="my-5 space-y-3 border-y border-line/70 py-4 text-xs">
            <div className="flex items-start justify-between gap-4"><dt className="text-caption">Divisi</dt><dd className="break-words text-right font-medium text-body">{employee.division || 'Belum diisi'}</dd></div>
            <div className="flex items-start justify-between gap-4"><dt className="text-caption">Kepegawaian</dt><dd className="text-right font-medium text-body">{EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}</dd></div>
            <div className="flex items-start justify-between gap-4"><dt className="text-caption">Mulai kontrak</dt><dd className="text-right font-medium text-body">{employee.contractStart ? new Date(`${employee.contractStart}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum diisi'}</dd></div>
          </dl>
          <div className="mt-auto flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-1.5 font-medium text-body"><FileCheck2 size={15} aria-hidden="true" />Dokumen wajib</span><span className={full ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-caption'}>{complete}/{REQUIRED_DOCS.length} lengkap</span></div>
          <button className="btn-primary employee-profile-button mt-4" aria-label={`Lihat profil ${employee.fullName}`} onClick={() => navigate(`/karyawan/${employee.id}`)}>Lihat Profil<ArrowUpRight size={16} aria-hidden="true" /></button>
        </article>;
      })}</div>}

      <Modal open={showModal} onClose={() => { if (!submitting) { setShowModal(false); setForm(emptyForm); setFormError(''); } }} title="Tambah Karyawan">
            <form onSubmit={(e) => void handleAddSubmit(e)} className="space-y-3">
              <div>
                <label htmlFor="add-fullName" className="field-label">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  id="add-fullName"
                  className="field-input"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Nama sesuai KTP"
                />
              </div>
              <div>
                <label htmlFor="add-position" className="field-label">Posisi <span className="text-red-500">*</span></label>
                <input
                  id="add-position"
                  className="field-input"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="mis. Staff Arsitek"
                />
              </div>
              <div>
                <label htmlFor="add-division" className="field-label">Divisi</label>
                <input
                  id="add-division"
                  className="field-input"
                  value={form.division}
                  onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                  placeholder="mis. Arsitektur"
                />
              </div>
              <div>
                <label htmlFor="add-employmentStatus" className="field-label">Status Kepegawaian <span className="text-red-500">*</span></label>
                <select
                  id="add-employmentStatus"
                  className="field-input"
                  value={form.employmentStatus}
                  onChange={(e) => setForm((f) => ({ ...f, employmentStatus: e.target.value as 'PKWT' | 'PKWTT' | 'FREELANCE' }))}
                >
                  <option value="PKWT">Kontrak (PKWT)</option>
                  <option value="PKWTT">Tetap (PKWTT)</option><option value="FREELANCE">Tenaga ahli / Freelance</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-salary" className="field-label">Gaji</label>
                <RupiahInput
                  id="add-salary"
                  value={form.salary}
                  onChange={(raw) => setForm((f) => ({ ...f, salary: raw }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-contractStart" className="field-label">Tanggal Mulai Kontrak</label>
                  <input
                    id="add-contractStart"
                    className="field-input"
                    type="date"
                    value={form.contractStart}
                    onChange={(e) => setForm((f) => ({ ...f, contractStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="add-contractEnd" className="field-label">Tanggal Selesai Kontrak</label>
                  <input
                    id="add-contractEnd"
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
                  disabled={submitting}
                  onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
