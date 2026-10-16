import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, Download, FileText, Users } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Modal } from '@/shared/ui/Modal';
import { FileViewerModal } from '@/shared/ui/FileViewerModal';
import {
  approveApplicant,
  archiveVacancy,
  closeVacancy,
  downloadAndDeleteVacancy,
  getApplicantFormData,
  getVacancy,
  listApplicants,
  rejectApplicant,
  reopenVacancy,
} from './vacancyService';
import { APPLICANT_STATUS_LABELS } from './types';
import type { Applicant, ApplicantFormDetail, Vacancy } from './types';
import { ApiError, apiFetchBlob } from '@/services/api';
import { FormPelamarModal } from './FormPelamarModal';
import { exportFormPelamarDocx } from './exportFormPelamar';

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
  const [busy, setBusy] = useState<number | 'close' | 'reopen' | 'archive' | 'download' | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [confirmReject, setConfirmReject] = useState<Applicant | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [fileLoading, setFileLoading] = useState<'cv' | 'portfolio' | null>(null);
  const [viewer, setViewer] = useState<{ blobUrl: string; title: string; filename: string } | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // State untuk modal Form Pelamar
  const [formApplicant, setFormApplicant] = useState<Applicant | null>(null);
  const [formDetail, setFormDetail] = useState<ApplicantFormDetail | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const signatureUrlRef = useRef<string | null>(null);
  const [formViewer, setFormViewer] = useState<{ blobUrl: string; title: string; filename: string } | null>(null);
  const formViewerRef = useRef<string | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);

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
      setSelected(null);
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menyetujui.' });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (applicant: Applicant) => {
    setBusy(applicant.id);
    setConfirmReject(null);
    setActionMsg(null);
    try {
      await rejectApplicant(applicant.id);
      setActionMsg({ type: 'ok', text: `Lamaran ${applicant.fullName} ditolak. Email penolakan dikirim.` });
      setSelected(null);
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menolak.' });
    } finally {
      setBusy(null);
    }
  };

  const closeViewer = () => {
    setViewer(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const closeFormViewer = () => {
    setFormViewer(null);
    if (formViewerRef.current) {
      URL.revokeObjectURL(formViewerRef.current);
      formViewerRef.current = null;
    }
  };

  const closeFormModal = () => {
    setFormApplicant(null);
    setFormDetail(null);
    setFormError('');
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
      setPhotoUrl(null);
    }
    if (signatureUrlRef.current) {
      URL.revokeObjectURL(signatureUrlRef.current);
      signatureUrlRef.current = null;
      setSignatureUrl(null);
    }
  };

  const handleOpenFormModal = async (applicant: Applicant) => {
    setFormApplicant(applicant);
    setFormDetail(null);
    setFormError('');
    setPhotoUrl(null);
    setSignatureUrl(null);
    setFormLoading(true);
    try {
      const detail = await getApplicantFormData(applicant.id);
      setFormDetail(detail);

      // Load foto jika ada
      if (detail.photoPath) {
        try {
          const photoBlob = await apiFetchBlob(`/applicants/${applicant.id}/file/photo`);
          const url = URL.createObjectURL(photoBlob);
          photoUrlRef.current = url;
          setPhotoUrl(url);
        } catch {
          // Foto gagal dimuat, lanjutkan tanpa foto
        }
      }

      // Load tanda tangan jika ada
      if (detail.signaturePath) {
        try {
          const sigBlob = await apiFetchBlob(`/applicants/${applicant.id}/file/signature`);
          const url = URL.createObjectURL(sigBlob);
          signatureUrlRef.current = url;
          setSignatureUrl(url);
        } catch {
          // Tanda tangan gagal dimuat
        }
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Gagal memuat data Form Pelamar.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportDocx = async () => {
    if (!formApplicant || !formDetail) return;
    setExportingDocx(true);
    try {
      await exportFormPelamarDocx(formApplicant, formDetail, photoUrl, signatureUrl);
    } catch (e) {
      setActionMsg({ type: 'err', text: 'Gagal mengekspor dokumen.' });
    } finally {
      setExportingDocx(false);
    }
  };

  const handleOpenFile = async (type: 'cv' | 'portfolio') => {
    if (!selected) return;
    setFileLoading(type);
    try {
      const blob    = await apiFetchBlob(`/applicants/${selected.id}/file/${type}`);
      const url     = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const label   = type === 'cv' ? 'CV' : 'Portofolio';
      const ext     = blob.type === 'application/pdf' ? 'pdf' : 'bin';
      setViewer({
        blobUrl:  url,
        title:    `${label} - ${selected.fullName}`,
        filename: `${type}-${selected.fullName.replace(/\s+/g, '_')}.${ext}`,
      });
    } catch {
      setActionMsg({ type: 'err', text: 'Gagal membuka berkas. Coba lagi.' });
    } finally {
      setFileLoading(null);
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

  const handleReopen = async () => {
    setBusy('reopen');
    try {
      const updated = await reopenVacancy(vacancyId);
      setVacancy(updated);
      setActionMsg({ type: 'ok', text: 'Lowongan berhasil dibuka kembali.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal membuka kembali lowongan.' });
    } finally {
      setBusy(null);
    }
  };

  const handleArchive = async () => {
    setBusy('archive');
    setConfirmArchive(false);
    try {
      const updated = await archiveVacancy(vacancyId);
      setVacancy(updated);
      setActionMsg({ type: 'ok', text: 'Lowongan berhasil diarsipkan. Gunakan tombol "Unduh & Hapus" di halaman Arsip untuk mengunduh data pelamar.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal mengarsipkan lowongan.' });
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadAndDelete = async () => {
    if (!vacancy) return;
    setBusy('download');
    setConfirmDownload(false);
    try {
      const safeName = vacancy.position.replace(/\s+/g, '_');
      const date     = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await downloadAndDeleteVacancy(vacancyId, `arsip-${safeName}-${date}.zip`);
      setActionMsg({ type: 'ok', text: 'Arsip berhasil diunduh. Data lowongan dan pelamar telah dihapus dari server.' });
      setTimeout(() => { window.location.href = '/lowongan'; }, 2000);
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal mengunduh arsip.' });
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!vacancy) return null;

  const newApplicants            = applicants.filter((a) => a.status === 'new');
  const formSubmittedApplicants  = applicants.filter((a) => a.status === 'form_submitted');
  const otherApplicants          = applicants.filter((a) => a.status !== 'new' && a.status !== 'form_submitted');

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
            <Badge
              variant={
                vacancy.status === 'open'
                  ? 'green'
                  : vacancy.status === 'archived'
                    ? 'amber'
                    : 'default'
              }
            >
              {vacancy.status === 'open'
                ? 'Terbuka'
                : vacancy.status === 'archived'
                  ? 'Diarsipkan'
                  : 'Ditutup'}
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
            {vacancy.status === 'closed' && (
              <>
                <button
                  className="btn-secondary !py-1.5 text-xs"
                  disabled={busy === 'reopen'}
                  onClick={() => void handleReopen()}
                >
                  {busy === 'reopen' ? 'Membuka...' : 'Buka Kembali'}
                </button>
                <button
                  className="btn-danger !py-1.5 text-xs"
                  disabled={busy === 'archive'}
                  onClick={() => setConfirmArchive(true)}
                >
                  {busy === 'archive' ? 'Mengarsipkan...' : 'Arsipkan'}
                </button>
              </>
            )}
            {vacancy.status === 'archived' && (
              <button
                className="!bg-amber-500 hover:!bg-amber-600 !text-white btn-primary !py-1.5 text-xs"
                disabled={busy === 'download'}
                onClick={() => setConfirmDownload(true)}
              >
                {busy === 'download' ? 'Mengunduh...' : 'Unduh & Hapus'}
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
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c2333]">
                  {newApplicants.map((a) => (
                    <tr
                      key={a.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2030]"
                      onClick={() => setSelected(a)}
                    >
                      <td className="td font-medium text-slate-900 dark:text-white">{a.fullName}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.email}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.phone}</td>
                      <td className="td text-xs text-slate-400 dark:text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="td text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                          <FileText size={13} /> Lihat Berkas
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Form Pelamar Masuk ({formSubmittedApplicants.length})
        </h2>
        <div className="card !p-0 overflow-hidden">
          {formSubmittedApplicants.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={22} />}
              title="Belum ada form yang terisi"
              description="Pelamar yang sudah mengisi Form Pelamar akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {['Nama', 'Email', 'Tanggal Submit', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c2333]">
                  {formSubmittedApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2030]">
                      <td className="td font-medium text-slate-900 dark:text-white">{a.fullName}</td>
                      <td className="td text-slate-500 dark:text-slate-400">{a.email}</td>
                      <td className="td text-xs text-slate-400 dark:text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="td text-right">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                          onClick={() => void handleOpenFormModal(a)}
                        >
                          <ClipboardList size={13} /> Lihat Form
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

      {/* Modal detail pelamar */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Detail Pelamar"
        size="md"
      >
        {selected && (
          <div className="space-y-5">
            {/* Info dasar */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-[#0c1018]">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Nama Lengkap</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{selected.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Tanggal Daftar</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {new Date(selected.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Email</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Nomor HP</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{selected.phone}</p>
              </div>
            </div>

            {/* Pesan dari pelamar */}
            {selected.message && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1c2333] dark:bg-[#0c1018]">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pesan dari Pelamar</p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{selected.message}</p>
              </div>
            )}

            {/* Berkas */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Berkas Lamaran</p>
              <div className="flex flex-col gap-2">
                {selected.hasCv && (
                  <button
                    onClick={() => void handleOpenFile('cv')}
                    disabled={fileLoading === 'cv'}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-[#1c2333] dark:bg-[#0f1520] dark:text-slate-200 dark:hover:bg-[#1a2030]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20">
                      <FileText size={18} />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block">Curriculum Vitae (CV)</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">PDF</span>
                    </span>
                    <Download size={15} className="text-slate-400" />
                    {fileLoading === 'cv' && <span className="text-xs text-slate-400">Membuka...</span>}
                  </button>
                )}
                {selected.hasPortfolio && (
                  <button
                    onClick={() => void handleOpenFile('portfolio')}
                    disabled={fileLoading === 'portfolio'}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-[#1c2333] dark:bg-[#0f1520] dark:text-slate-200 dark:hover:bg-[#1a2030]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/20">
                      <FileText size={18} />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block">Portofolio</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">PDF</span>
                    </span>
                    <Download size={15} className="text-slate-400" />
                    {fileLoading === 'portfolio' && <span className="text-xs text-slate-400">Membuka...</span>}
                  </button>
                )}
                {!selected.hasCv && !selected.hasPortfolio && (
                  <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada berkas tersedia.</p>
                )}
              </div>
            </div>

            {/* Tombol aksi */}
            {selected.status === 'new' && (
              <div className="flex gap-2 border-t border-slate-100 pt-4 dark:border-[#1c2333]">
                <button
                  className="btn-danger flex-1"
                  disabled={busy === selected.id}
                  onClick={() => setConfirmReject(selected)}
                >
                  {busy === selected.id ? '...' : 'Tolak Lamaran'}
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={busy === selected.id}
                  onClick={() => void handleApprove(selected)}
                >
                  {busy === selected.id ? '...' : 'Setujui & Kirim Form'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <FileViewerModal
        open={viewer !== null}
        onClose={closeViewer}
        blobUrl={viewer?.blobUrl ?? null}
        title={viewer?.title ?? ''}
        filename={viewer?.filename}
        loading={false}
      />

      <FormPelamarModal
        open={formApplicant !== null}
        applicant={formApplicant}
        detail={formDetail}
        loading={formLoading}
        error={formError}
        photoUrl={photoUrl}
        signatureUrl={signatureUrl}
        onClose={closeFormModal}
        onExportDocx={() => void handleExportDocx()}
        exportingDocx={exportingDocx}
      />

      <FileViewerModal
        open={formViewer !== null}
        onClose={closeFormViewer}
        blobUrl={formViewer?.blobUrl ?? null}
        title={formViewer?.title ?? ''}
        filename={formViewer?.filename}
        loading={false}
      />

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Tutup Lowongan?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Tautan pendaftaran akan langsung tidak aktif. Lowongan masih bisa dibuka kembali nanti.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Batal</button>
            <button className="btn-danger" onClick={() => void handleClose()}>Ya, Tutup</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Arsipkan Lowongan?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Lowongan akan diarsipkan. Status berubah ke <strong className="text-slate-700">Diarsipkan</strong>{' '}
            dan tidak bisa dibuka kembali. Data pelamar masih tersimpan hingga Anda mengunduh arsip.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmArchive(false)}>Batal</button>
            <button className="btn-danger" disabled={busy === 'archive'} onClick={() => void handleArchive()}>
              {busy === 'archive' ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmReject !== null}
        onClose={() => setConfirmReject(null)}
        title="Tolak Lamaran?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Lamaran dari <strong className="text-slate-700">{confirmReject?.fullName}</strong> akan ditolak
            dan email penolakan akan dikirim secara otomatis.
            Data pelamar akan <strong className="text-slate-700">dihapus permanen</strong> dari server.
          </p>
          <p className="text-xs text-red-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmReject(null)}>Batal</button>
            <button
              className="btn-danger"
              disabled={busy === confirmReject?.id}
              onClick={() => confirmReject && void handleReject(confirmReject)}
            >
              {busy === confirmReject?.id ? 'Menolak...' : 'Ya, Tolak Lamaran'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDownload}
        onClose={() => setConfirmDownload(false)}
        title="Unduh & Hapus Data?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Semua data pelamar (CSV + berkas CV dan portofolio) akan dikemas dalam satu file ZIP dan diunduh.
            Setelah unduhan selesai, <strong className="text-slate-700">seluruh data pelamar dan lowongan ini akan dihapus permanen dari server</strong>.
            Pastikan file ZIP berhasil tersimpan sebelum melanjutkan.
          </p>
          <p className="text-xs text-amber-600">
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDownload(false)}>Batal</button>
            <button
              className="!bg-amber-500 hover:!bg-amber-600 !text-white btn-primary"
              disabled={busy === 'download'}
              onClick={() => void handleDownloadAndDelete()}
            >
              {busy === 'download' ? 'Mengunduh...' : 'Ya, Unduh & Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
