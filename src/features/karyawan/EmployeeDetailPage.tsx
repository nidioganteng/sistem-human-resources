import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/services/api';
import {
  generateOnboardingLink,
  getEmployee,
  openDocument,
  updateEmployee,
  validateEmployee,
} from './karyawanService';
import type { Employee } from './types';
import {
  DOC_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  PERSONAL_DATA_LABELS,
} from './types';
import { formatRupiah, RupiahInput } from '@/shared/ui/RupiahInput';

const STATUS_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Aktif',
  inactive: 'Tidak Aktif',
};

function statusBadge(status: string): string {
  if (status === 'active') return 'rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400';
  if (status === 'onboarding') return 'rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400';
  return 'rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500 dark:bg-slate-700/60 dark:text-slate-400';
}

interface EditForm {
  nik: string;
  email: string;
  phone: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT';
  salary: string;
  contractStart: string;
  contractEnd: string;
  birth_date: string;
  birth_place: string;
  address: string;
  religion: string;
  marital_status: string;
  npwp_number: string;
  bpjs_number: string;
  emergency_contact: string;
}

function employeeToForm(e: Employee): EditForm {
  const pd = e.personalData ?? {};
  return {
    nik: e.nik ?? '',
    email: e.email ?? '',
    phone: e.phone ?? '',
    position: e.position,
    division: e.division ?? '',
    employmentStatus: e.employmentStatus,
    salary: e.salary != null ? String(e.salary) : '',
    contractStart: e.contractStart ?? '',
    contractEnd: e.contractEnd ?? '',
    birth_date: pd['birth_date'] ?? '',
    birth_place: pd['birth_place'] ?? '',
    address: pd['address'] ?? '',
    religion: pd['religion'] ?? '',
    marital_status: pd['marital_status'] ?? '',
    npwp_number: pd['npwp_number'] ?? '',
    bpjs_number: pd['bpjs_number'] ?? '',
    emergency_contact: pd['emergency_contact'] ?? '',
  };
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}


export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [validating, setValidating] = useState(false);
  const [confirmValidate, setConfirmValidate] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const employeeId = Number(id);
  const isHr = user?.role === 'hr';

  const load = async () => {
    try {
      setLoading(true);
      const e = await getEmployee(employeeId);
      setEmployee(e);
    } catch {
      setError('Gagal memuat data karyawan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [employeeId]);

  const handleGenerateLink = async () => {
    if (!employee) return;
    setGeneratingLink(true);
    setActionMsg(null);
    try {
      const res = await generateOnboardingLink(employee.id, window.location.origin);
      setOnboardingUrl(res.onboardingUrl);
      setEmployee({ ...employee, hasOnboardingToken: true });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal membuat tautan.' });
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopy = () => {
    if (!onboardingUrl) return;
    void navigator.clipboard.writeText(onboardingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleValidate = async () => {
    if (!employee) return;
    setValidating(true);
    setConfirmValidate(false);
    setActionMsg(null);
    try {
      const updated = await validateEmployee(employee.id);
      setEmployee(updated);
      setActionMsg({ type: 'ok', text: 'Karyawan berhasil divalidasi dan sekarang berstatus aktif.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal memvalidasi.' });
    } finally {
      setValidating(false);
    }
  };

  const handleEditOpen = () => {
    if (!employee) return;
    setEditForm(employeeToForm(employee));
    setEditError('');
    setShowEdit(true);
  };

  const handleEditSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editForm || !employee) return;
    if (!editForm.position.trim()) { setEditError('Posisi wajib diisi.'); return; }

    setEditSubmitting(true);
    setEditError('');
    try {
      const updated = await updateEmployee(employee.id, {
        nik: editForm.nik.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        position: editForm.position.trim(),
        division: editForm.division.trim(),
        employmentStatus: editForm.employmentStatus,
        salary: editForm.salary !== '' ? parseFloat(editForm.salary) : null,
        contractStart: editForm.contractStart !== '' ? editForm.contractStart : null,
        contractEnd: editForm.contractEnd !== '' ? editForm.contractEnd : null,
        personalData: {
          birth_date: editForm.birth_date,
          birth_place: editForm.birth_place,
          address: editForm.address,
          religion: editForm.religion,
          marital_status: editForm.marital_status,
          npwp_number: editForm.npwp_number,
          bpjs_number: editForm.bpjs_number,
          emergency_contact: editForm.emergency_contact,
        },
      });
      setEmployee(updated);
      setShowEdit(false);
      setActionMsg({ type: 'ok', text: 'Data karyawan berhasil diperbarui.' });
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : 'Gagal memperbarui data.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDoc = async (docType: string) => {
    try {
      await openDocument(employeeId, docType);
    } catch {
      setActionMsg({ type: 'err', text: 'Gagal membuka dokumen.' });
    }
  };

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">Memuat...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!employee) return null;

  const hasSubmittedData = employee.nik != null && employee.email != null;
  const allDocTypes = ['ktp', 'npwp', 'bpjs', 'ijazah', 'foto', 'lainnya'];
  const uploadedDocTypes = new Set(employee.documents.map((d) => d.docType));

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/karyawan')}
        className="flex items-center gap-1 text-sm text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
      >
        <ChevronLeft size={15} /> Kembali
      </button>

      {actionMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          actionMsg.type === 'ok'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400'
            : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
        }`}>
          {actionMsg.text}
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              {employee.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {employee.position}
              {employee.division ? ` · ${employee.division}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={statusBadge(employee.status)}>
              {STATUS_LABELS[employee.status]}
            </span>
            {isHr && (
              <button className="btn-secondary !py-1.5 text-xs" onClick={handleEditOpen}>
                Edit Data
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            { label: 'NIK', value: employee.nik ?? '-' },
            { label: 'Email', value: employee.email ?? '-' },
            { label: 'Nomor HP', value: employee.phone ?? '-' },
            { label: 'Status Kepegawaian', value: EMPLOYMENT_STATUS_LABELS[employee.employmentStatus] },
            { label: 'Gaji', value: formatRupiah(employee.salary) },
            { label: 'Mulai Kontrak', value: formatDate(employee.contractStart) },
            { label: 'Selesai Kontrak', value: formatDate(employee.contractEnd) },
            { label: 'Divalidasi', value: employee.validatedAt ? formatDate(employee.validatedAt) : '-' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {isHr && employee.status === 'onboarding' && (
          <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tindakan Onboarding</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary text-xs !py-1.5"
                disabled={generatingLink}
                onClick={() => void handleGenerateLink()}
              >
                {generatingLink ? 'Membuat...' : 'Buat Link Onboarding'}
              </button>
              {hasSubmittedData && (
                <button
                  className="btn-primary text-xs !py-1.5"
                  disabled={validating}
                  onClick={() => setConfirmValidate(true)}
                >
                  {validating ? 'Memvalidasi...' : 'Validasi Karyawan'}
                </button>
              )}
            </div>

            {onboardingUrl && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                  {onboardingUrl}
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
        )}
      </div>

      {employee.personalData != null && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Pribadi</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {Object.entries(PERSONAL_DATA_LABELS).map(([key, label]) => {
              const val = employee.personalData?.[key];
              if (!val) return null;
              return (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
                  <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{val}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dokumen</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allDocTypes.map((dt) => {
            const has = uploadedDocTypes.has(dt);
            return (
              <div
                key={dt}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {DOC_TYPE_LABELS[dt]}
                  </p>
                  <span className={`text-xs font-semibold ${has ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {has ? 'Ada' : 'Belum'}
                  </span>
                </div>
                {has && isHr && (
                  <button
                    className="text-xs text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                    onClick={() => void handleOpenDoc(dt)}
                  >
                    Lihat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {confirmValidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm space-y-4 dark:!bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Validasi Karyawan?</h2>
              <button
                onClick={() => setConfirmValidate(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Karyawan akan berpindah ke status Aktif dan datanya dapat dibaca oleh Simatra.
              Tindakan ini tidak dapat dibatalkan lewat sistem.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmValidate(false)}>Batal</button>
              <button className="btn-primary" onClick={() => void handleValidate()}>Ya, Validasi</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 dark:!bg-slate-800">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10 pb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Data Karyawan</h2>
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            {employee.validatedAt != null && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                Perubahan data karyawan yang sudah aktif akan dicatat sebagai audit log dan CEO akan mendapat notifikasi.
              </div>
            )}

            <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Data Kontrak</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">NIK</label>
                  <input className="field-input" value={editForm.nik} onChange={(e) => setEditForm((f) => f ? { ...f, nik: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => f ? { ...f, email: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Nomor HP</label>
                  <input className="field-input" type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Posisi <span className="text-red-500">*</span></label>
                  <input className="field-input" value={editForm.position} onChange={(e) => setEditForm((f) => f ? { ...f, position: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Divisi</label>
                  <input className="field-input" value={editForm.division} onChange={(e) => setEditForm((f) => f ? { ...f, division: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Status Kepegawaian</label>
                  <select className="field-input" value={editForm.employmentStatus} onChange={(e) => setEditForm((f) => f ? { ...f, employmentStatus: e.target.value as 'PKWT' | 'PKWTT' } : f)}>
                    <option value="PKWT">Kontrak (PKWT)</option>
                    <option value="PKWTT">Tetap (PKWTT)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Gaji</label>
                  <RupiahInput
                    value={editForm.salary}
                    onChange={(raw) => setEditForm((f) => f ? { ...f, salary: raw } : f)}
                  />
                </div>
                <div>
                  <label className="field-label">Mulai Kontrak</label>
                  <input className="field-input" type="date" value={editForm.contractStart} onChange={(e) => setEditForm((f) => f ? { ...f, contractStart: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Selesai Kontrak</label>
                  <input className="field-input" type="date" value={editForm.contractEnd} onChange={(e) => setEditForm((f) => f ? { ...f, contractEnd: e.target.value } : f)} />
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Data Pribadi</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Tanggal Lahir</label>
                  <input className="field-input" type="date" value={editForm.birth_date} onChange={(e) => setEditForm((f) => f ? { ...f, birth_date: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Tempat Lahir</label>
                  <input className="field-input" value={editForm.birth_place} onChange={(e) => setEditForm((f) => f ? { ...f, birth_place: e.target.value } : f)} />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Alamat</label>
                  <textarea className="field-input resize-none" rows={2} value={editForm.address} onChange={(e) => setEditForm((f) => f ? { ...f, address: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Agama</label>
                  <input className="field-input" value={editForm.religion} onChange={(e) => setEditForm((f) => f ? { ...f, religion: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Status Pernikahan</label>
                  <select className="field-input" value={editForm.marital_status} onChange={(e) => setEditForm((f) => f ? { ...f, marital_status: e.target.value } : f)}>
                    <option value="">-- Pilih --</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Cerai">Cerai</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Nomor NPWP</label>
                  <input className="field-input" value={editForm.npwp_number} onChange={(e) => setEditForm((f) => f ? { ...f, npwp_number: e.target.value } : f)} />
                </div>
                <div>
                  <label className="field-label">Nomor BPJS</label>
                  <input className="field-input" value={editForm.bpjs_number} onChange={(e) => setEditForm((f) => f ? { ...f, bpjs_number: e.target.value } : f)} />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Kontak Darurat</label>
                  <input className="field-input" value={editForm.emergency_contact} onChange={(e) => setEditForm((f) => f ? { ...f, emergency_contact: e.target.value } : f)} />
                </div>
              </div>

              {editError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Batal</button>
                <button type="submit" className="btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
