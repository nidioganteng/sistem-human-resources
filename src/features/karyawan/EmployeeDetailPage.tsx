import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BriefcaseBusiness, ChevronLeft, Copy, Download, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { ApiError, apiFetchBlob } from '@/services/api';
import {
  generateOnboardingLink,
  getEmployee,
  openDocument,
  updateEmployee,
  uploadEmployeeDocument,
  validateEmployee,
} from './karyawanService';
import type { Employee } from './types';
import {
  DOC_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  PERSONAL_DATA_LABELS,
} from './types';
import { formatRupiah, RupiahInput } from '@/shared/ui/RupiahInput';
import { Modal } from '@/shared/ui/Modal';

const STATUS_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Aktif',
  inactive: 'Tidak Aktif',
};

const DISCIPLINE_LABELS = { verbal: 'Teguran lisan', written: 'Teguran tertulis', SP1: 'SP 1', SP2: 'SP 2', SP3: 'SP 3' };
const CAREER_LABELS = { promotion: 'Promosi', demotion: 'Demosi', decree: 'Surat Keputusan' };

function statusBadge(status: string): string {
  if (status === 'active') return 'rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400';
  if (status === 'onboarding') return 'rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400';
  return 'rounded-full bg-subtle px-3 py-1 text-sm font-semibold text-caption';
}

interface EditForm {
  ptkp_status: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  payment_hold_note: string;

  nik: string;
  email: string;
  phone: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT' | 'FREELANCE';
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
    ptkp_status: pd['ptkp_status'] ?? '',
    bank_name: pd['bank_name'] ?? '',
    bank_account: pd['bank_account'] ?? '',
    bank_account_name: pd['bank_account_name'] ?? '',
    payment_hold_note: pd['payment_hold_note'] ?? '',
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
  const [downloadingRecord, setDownloadingRecord] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

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
      setActionMsg({type:'ok',text:res.emailQueued ? 'Tautan onboarding dibuat dan email masuk antrean pengiriman ke karyawan.' : 'Tautan onboarding dibuat. Salin tautan dan bagikan kepada karyawan.'});
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
      setEmployee({ ...employee, ...updated });
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
          ...employee?.personalData,
          ptkp_status: editForm.ptkp_status,
          bank_name: editForm.bank_name,
          bank_account: editForm.bank_account,
          bank_account_name: editForm.bank_account_name,
          payment_hold_note: editForm.payment_hold_note,
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
      setEmployee({ ...employee, ...updated });
      setShowEdit(false);
      setActionMsg({ type: 'ok', text: updated.changePending ? 'Perubahan diajukan. Data aktif menunggu persetujuan CEO.' : 'Data karyawan berhasil diperbarui.' });
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

  const downloadRecord = async (recordId: number) => {
    setDownloadingRecord(recordId);
    try {
      const blob = await apiFetchBlob(`/employee-records/${recordId}/file`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dokumen-riwayat-${recordId}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setActionMsg({ type: 'err', text: 'Gagal mengunduh lampiran riwayat. Silakan coba lagi.' });
    } finally {
      setDownloadingRecord(null);
    }
  };

  const handleDocumentUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employee || !uploadType || uploading) return;
    if (!uploadFile) { setUploadError('Pilih berkas terlebih dahulu.'); return; }
    const photo = uploadType === 'foto';
    const allowed = photo ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(uploadFile.type)) { setUploadError(photo ? 'Pasfoto harus JPEG atau PNG.' : 'Dokumen harus PDF, JPEG, atau PNG.'); return; }
    if (uploadFile.size === 0 || uploadFile.size > (photo ? 500 * 1024 : 2 * 1024 * 1024)) {
      setUploadError(photo ? 'Pasfoto maksimal 500 KB dan tidak boleh kosong.' : 'Dokumen maksimal 2 MB dan tidak boleh kosong.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const updated = await uploadEmployeeDocument(employee.id, uploadType, uploadFile);
      setEmployee(updated);
      setUploadType(null);
      setUploadFile(null);
      setActionMsg({ type: 'ok', text: `${DOC_TYPE_LABELS[uploadType]} berhasil diperbarui. Penggantian tercatat dalam audit.` });
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : 'Gagal mengunggah dokumen. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-sm text-caption">Memuat...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!employee) return null;

  const hasSubmittedData = Boolean(employee.nik?.trim() && employee.email?.trim());
  const allDocTypes = Object.keys(DOC_TYPE_LABELS);
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
            <h1 className="font-heading text-xl font-bold text-ink">
              {employee.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-caption">
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
              <p className="text-xs font-semibold uppercase tracking-wider text-caption">{label}</p>
              <p className="mt-0.5 text-sm text-ink">{value}</p>
            </div>
          ))}
        </div>

        {isHr && employee.status === 'onboarding' && (
          <div className="space-y-3 border-t border-line pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-body">Tindakan Onboarding</h2>
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
              <div className="flex items-center gap-3 rounded-xl bg-subtle px-4 py-3 dark:bg-white/5">
                <span className="min-w-0 flex-1 break-all font-mono text-xs text-caption">
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
          <h2 className="text-sm font-semibold text-body">Data Pribadi</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {Object.entries(PERSONAL_DATA_LABELS).map(([key, label]) => {
              const val = employee.personalData?.[key];
              if (!val) return null;
              return (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-caption">{label}</p>
                  <p className="mt-0.5 text-sm text-ink">{val}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-body">Dokumen</h2>
          {isHr && <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => { setUploadType('ktp'); setUploadFile(null); setUploadError(''); }}>Edit Dokumen</button>}
        </div>
        {employee.status === 'onboarding' && <p className="text-xs text-caption">{['ktp','kk','npwp','bpjs','ijazah','foto'].filter(type=>uploadedDocTypes.has(type)).length} dari 6 dokumen wajib tersedia. Status tetap Onboarding sampai HR memeriksa dan memvalidasi kelengkapannya.</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allDocTypes.map((dt) => {
            const has = uploadedDocTypes.has(dt);
            return (
              <div
                key={dt}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {DOC_TYPE_LABELS[dt]}
                  </p>
                  <span className={`text-xs font-semibold ${has ? 'text-emerald-600 dark:text-emerald-400' : 'text-caption'}`}>
                    {has ? 'Ada' : 'Belum'}
                  </span>
                </div>
                {has && (user?.role === 'hr' || user?.role === 'super_admin') && (
                  <button
                    className="btn-ghost !px-3 !text-xs"
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

      {employee.discipline !== undefined && (
        <section className="card space-y-5" aria-labelledby="discipline-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={19} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
              <h2 id="discipline-heading" className="text-sm font-semibold text-ink">Riwayat Kedisiplinan</h2>
              <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-body">{employee.discipline.length} catatan</span>
            </div>
            <button className="btn-secondary !text-xs" onClick={() => navigate('/kedisiplinan')}>Kelola Kedisiplinan</button>
          </div>
          {!employee.discipline.length ? <p className="text-sm text-caption">Belum ada catatan teguran atau surat peringatan untuk karyawan ini.</p> : (
            <ol className="divide-y divide-line">
              {employee.discipline.map(record => <li key={record.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${record.kind.startsWith('SP') ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{DISCIPLINE_LABELS[record.kind]}</span>
                  <time dateTime={record.date} className="text-xs text-caption">{formatDate(record.date)}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-body">{record.notes}</p>
                {record.hasAttachment && <button className="btn-secondary !text-xs" disabled={downloadingRecord !== null} onClick={() => void downloadRecord(record.id)}><Download size={14} aria-hidden="true" />{downloadingRecord === record.id ? 'Mengunduh...' : 'Unduh Lampiran'}</button>}
              </li>)}
            </ol>
          )}
        </section>
      )}

      {employee.career !== undefined && (
        <section className="card space-y-5" aria-labelledby="career-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <BriefcaseBusiness size={19} className="text-accent" aria-hidden="true" />
              <h2 id="career-heading" className="text-sm font-semibold text-ink">Riwayat Karier</h2>
              <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-body">{employee.career.length} catatan</span>
            </div>
            <button className="btn-secondary !text-xs" onClick={() => navigate('/karier')}>Kelola Riwayat Karier</button>
          </div>
          {!employee.career.length ? <p className="text-sm text-caption">Belum ada catatan promosi, demosi, atau surat keputusan untuk karyawan ini.</p> : (
            <ol className="divide-y divide-line">
              {employee.career.map(record => <li key={record.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{CAREER_LABELS[record.kind]}</span>
                  <time dateTime={record.date} className="text-xs text-caption">{formatDate(record.date)}</time>
                </div>
                <p className="break-words text-sm font-semibold text-ink">{record.position}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-body">{record.notes}</p>
                {record.hasAttachment && <button className="btn-secondary !text-xs" disabled={downloadingRecord !== null} onClick={() => void downloadRecord(record.id)}><Download size={14} aria-hidden="true" />{downloadingRecord === record.id ? 'Mengunduh...' : 'Unduh Lampiran'}</button>}
              </li>)}
            </ol>
          )}
        </section>
      )}

      <Modal open={uploadType !== null} onClose={() => { if (!uploading) setUploadType(null); }} title="Edit Dokumen Karyawan" size="sm">
        <form onSubmit={event => void handleDocumentUpload(event)} className="space-y-5">
          <p className="text-sm leading-relaxed text-body">Unggah dokumen terbaru untuk <strong className="font-semibold text-ink">{employee.fullName}</strong>. Penggantian dicatat dalam audit dan berkas sebelumnya tetap disimpan.</p>
          <div>
            <label htmlFor="employee-document-type" className="field-label">Dokumen yang ingin diperbarui</label>
            <select id="employee-document-type" className="field-input" disabled={uploading} value={uploadType ?? 'ktp'} onChange={event => { setUploadType(event.target.value); setUploadFile(null); setUploadError(''); }}>
              {allDocTypes.map(type => <option key={type} value={type}>{DOC_TYPE_LABELS[type]} — {uploadedDocTypes.has(type) ? 'Sudah tersedia' : 'Belum diunggah'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="employee-document-file" className="field-label">Berkas {DOC_TYPE_LABELS[uploadType ?? '']}</label>
            <input key={uploadType} id="employee-document-file" type="file" required disabled={uploading} accept={uploadType === 'foto' ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'} className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-accent" aria-describedby="employee-document-hint employee-document-error" aria-invalid={Boolean(uploadError)} onChange={event => { setUploadFile(event.target.files?.[0] ?? null); setUploadError(''); }} />
            <p id="employee-document-hint" className="mt-2 text-xs text-caption">{uploadType === 'foto' ? 'JPEG atau PNG, maksimal 500 KB.' : 'PDF, JPEG, atau PNG, maksimal 2 MB.'}</p>
          </div>
          <p id="employee-document-error" role={uploadError ? 'alert' : undefined} className={uploadError ? 'text-sm text-red-700 dark:text-red-300' : 'hidden'}>{uploadError}</p>
          <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <button type="button" disabled={uploading} className="btn-secondary" onClick={() => setUploadType(null)}>Batal</button>
            <button type="submit" disabled={uploading || !uploadFile} className="btn-primary">{uploading ? 'Menyimpan...' : 'Simpan Dokumen'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmValidate} onClose={() => setConfirmValidate(false)} title="Validasi Karyawan?" size="sm">
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-body">
            Validasi <strong className="font-semibold text-ink">{employee.fullName}</strong> untuk mengubah statusnya menjadi <strong className="font-semibold text-ink">Aktif</strong>.
          </p>
          <div className="rounded-xl border border-line bg-subtle p-4 text-sm leading-relaxed text-body">
            Pastikan biodata dan keenam dokumen wajib sudah diperiksa sebelum melanjutkan.
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setConfirmValidate(false)}>Batal</button>
            <button type="button" className="btn-primary" disabled={validating} onClick={() => void handleValidate()}>{validating ? 'Memvalidasi...' : 'Ya, Validasi'}</button>
          </div>
        </div>
      </Modal>

      {showEdit && editForm && (
        <Modal open={showEdit} onClose={() => { if (!editSubmitting) setShowEdit(false); }} title="Edit Data Karyawan" size="lg">
          <p className="mb-6 text-sm leading-relaxed text-caption">Perbarui data {employee.fullName}. Pastikan informasi sudah benar sebelum menyimpan.</p>
            {employee.validatedAt != null && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                Perubahan data tervalidasi akan diajukan kepada CEO. Data aktif diperbarui setelah disetujui.
              </div>
            )}

            <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-caption">Identitas &amp; Kepegawaian</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-nik" className="field-label">NIK</label>
                  <input id="edit-nik" className="field-input" value={editForm.nik} onChange={(e) => setEditForm((f) => f ? { ...f, nik: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-email" className="field-label">Email</label>
                  <input id="edit-email" className="field-input" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => f ? { ...f, email: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-phone" className="field-label">Nomor HP</label>
                  <input id="edit-phone" className="field-input" type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-position" className="field-label">Posisi <span className="text-red-500">*</span></label>
                  <input id="edit-position" required className="field-input" value={editForm.position} onChange={(e) => setEditForm((f) => f ? { ...f, position: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-division" className="field-label">Divisi</label>
                  <input id="edit-division" className="field-input" value={editForm.division} onChange={(e) => setEditForm((f) => f ? { ...f, division: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-employmentStatus" className="field-label">Status Kepegawaian</label>
                  <select id="edit-employmentStatus" className="field-input" value={editForm.employmentStatus} onChange={(e) => setEditForm((f) => f ? { ...f, employmentStatus: e.target.value as 'PKWT' | 'PKWTT' | 'FREELANCE' } : f)}>
                    <option value="PKWT">Kontrak (PKWT)</option>
                    <option value="PKWTT">Tetap (PKWTT)</option><option value="FREELANCE">Tenaga ahli / Freelance</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-salary" className="field-label">Gaji</label>
                  <RupiahInput
                    id="edit-salary"
                    value={editForm.salary}
                    onChange={(raw) => setEditForm((f) => f ? { ...f, salary: raw } : f)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-contractStart" className="field-label">Mulai Kontrak</label>
                  <input id="edit-contractStart" className="field-input" type="date" value={editForm.contractStart} onChange={(e) => setEditForm((f) => f ? { ...f, contractStart: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-contractEnd" className="field-label">Selesai Kontrak</label>
                  <input id="edit-contractEnd" className="field-input" type="date" value={editForm.contractEnd} onChange={(e) => setEditForm((f) => f ? { ...f, contractEnd: e.target.value } : f)} />
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-caption pt-2">Data Payroll</h3>
              <div className="grid gap-3 sm:grid-cols-2">{(['ptkp_status','bank_name','bank_account','bank_account_name','payment_hold_note'] as const).map(key=><div key={key}><label htmlFor={`edit-${key}`} className="field-label">{PERSONAL_DATA_LABELS[key]}</label><input id={`edit-${key}`} className="field-input" value={editForm[key]} onChange={e=>setEditForm(f=>f?{...f,[key]:e.target.value}:f)}/></div>)}</div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-caption pt-2">Data Pribadi</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-birth_date" className="field-label">Tanggal Lahir</label>
                  <input id="edit-birth_date" className="field-input" type="date" value={editForm.birth_date} onChange={(e) => setEditForm((f) => f ? { ...f, birth_date: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-birth_place" className="field-label">Tempat Lahir</label>
                  <input id="edit-birth_place" className="field-input" value={editForm.birth_place} onChange={(e) => setEditForm((f) => f ? { ...f, birth_place: e.target.value } : f)} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-address" className="field-label">Alamat</label>
                  <textarea id="edit-address" className="field-input resize-none" rows={2} value={editForm.address} onChange={(e) => setEditForm((f) => f ? { ...f, address: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-religion" className="field-label">Agama</label>
                  <input id="edit-religion" className="field-input" value={editForm.religion} onChange={(e) => setEditForm((f) => f ? { ...f, religion: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-marital_status" className="field-label">Status Pernikahan</label>
                  <select id="edit-marital_status" className="field-input" value={editForm.marital_status} onChange={(e) => setEditForm((f) => f ? { ...f, marital_status: e.target.value } : f)}>
                    <option value="">-- Pilih --</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Cerai">Cerai</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-npwp_number" className="field-label">Nomor NPWP</label>
                  <input id="edit-npwp_number" className="field-input" value={editForm.npwp_number} onChange={(e) => setEditForm((f) => f ? { ...f, npwp_number: e.target.value } : f)} />
                </div>
                <div>
                  <label htmlFor="edit-bpjs_number" className="field-label">Nomor BPJS</label>
                  <input id="edit-bpjs_number" className="field-input" value={editForm.bpjs_number} onChange={(e) => setEditForm((f) => f ? { ...f, bpjs_number: e.target.value } : f)} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-emergency_contact" className="field-label">Kontak Darurat</label>
                  <input id="edit-emergency_contact" className="field-input" value={editForm.emergency_contact} onChange={(e) => setEditForm((f) => f ? { ...f, emergency_contact: e.target.value } : f)} />
                </div>
              </div>

              {editError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  {editError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
                <button type="button" className="btn-secondary" disabled={editSubmitting} onClick={() => setShowEdit(false)}>Batal</button>
                <button type="submit" className="btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
