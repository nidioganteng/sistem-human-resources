import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, Download, FileText, ListChecks, Users } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Modal } from '@/shared/ui/Modal';
import { FileViewerModal } from '@/shared/ui/FileViewerModal';
import {
  approveApplicant,
  archiveVacancy,
  callToSelection,
  closeVacancy,
  downloadAndDeleteVacancy,
  getApplicantFormData,
  getSelectionRecords,
  getVacancy,
  hireApplicant,
  listApplicants,
  recordSelectionResult,
  rejectApplicant,
  reopenVacancy,
  shortlistApplicant,
} from './vacancyService';
import { APPLICANT_STATUS_LABELS } from './types';
import type { Applicant, ApplicantFormDetail, SelectionRecord, Vacancy } from './types';
import { ApiError, apiFetchBlob } from '@/services/api';
import { RupiahInput } from '@/shared/ui/RupiahInput';
import { FormPelamarModal } from './FormPelamarModal';
import { exportFormPelamarDocx } from './exportFormPelamar';
import { useAuth } from '@/auth/AuthContext';
import { createOl, listOls } from '@/features/recruitment/ol/olService';
import type { OfferingLetter } from '@/features/recruitment/ol/types';

const APPLICANT_BADGE: Partial<Record<string, 'default' | 'green' | 'red' | 'amber'>> = {
  new:            'amber',
  screen_rejected:'red',
  form_pending:   'amber',
  form_submitted: 'amber',
  shortlisted:    'green',
  selection:      'green',
  offer_pending:  'default',
  hired:          'green',
  not_selected:   'red',
  declined:       'red',
  expired:        'red',
};

const STAGE_LABELS: Record<string, string> = {
  competency_test: 'Tes Kompetensi',
  interview:       'Wawancara',
};

const RESULT_LABELS: Record<string, string> = {
  pass: 'Lulus',
  fail: 'Tidak Lulus',
};

export default function VacancyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
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
  const [shortlisting, setShortlisting] = useState(false);

  // State untuk OL
  const [olMap, setOlMap] = useState<Record<number, OfferingLetter>>({});
  const [showOlModal, setShowOlModal] = useState(false);
  const [olApplicant, setOlApplicant] = useState<Applicant | null>(null);
  const [olPosition, setOlPosition] = useState('');
  const [olSalary, setOlSalary] = useState('');
  const [olStartDate, setOlStartDate] = useState('');
  const [olBody, setOlBody] = useState('');
  const [creatingOl, setCreatingOl] = useState(false);
  const [olError, setOlError] = useState('');

  // State untuk seleksi
  const [selectionApplicant, setSelectionApplicant] = useState<Applicant | null>(null);
  const [selectionRecords, setSelectionRecords] = useState<SelectionRecord[]>([]);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [selectionStage, setSelectionStage] = useState<'competency_test' | 'interview'>('competency_test');
  const [selectionResult, setSelectionResult] = useState<'pass' | 'fail'>('pass');
  const [selectionNotes, setSelectionNotes] = useState('');
  const [savingSelection, setSavingSelection] = useState(false);
  const [busyCall, setBusyCall] = useState<number | null>(null);
  const [busyHire, setBusyHire] = useState<number | null>(null);

  const vacancyId = Number(id);

  const load = async () => {
    try {
      setLoading(true);
      const [vac, appRes] = await Promise.all([getVacancy(vacancyId), listApplicants(vacancyId)]);
      setVacancy(vac);
      setApplicants(appRes.items);
      // HR: buat peta applicantId -> OL agar bisa tampilkan tombol Lihat OL
      if (currentUser?.role === 'hr') {
        try {
          const olRes = await listOls();
          const map: Record<number, OfferingLetter> = {};
          for (const ol of olRes.items) {
            map[ol.applicantId] = ol;
          }
          setOlMap(map);
        } catch {
          // OL map gagal dimuat, tombol tetap bisa muncul via fallback
        }
      }
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

  const handleShortlist = async () => {
    if (!formApplicant) return;
    setShortlisting(true);
    setActionMsg(null);
    try {
      await shortlistApplicant(formApplicant.id);
      setActionMsg({ type: 'ok', text: `${formApplicant.fullName} berhasil di-shortlist.` });
      closeFormModal();
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal melakukan shortlist.' });
    } finally {
      setShortlisting(false);
    }
  };

  const handleCallToSelection = async (applicant: Applicant) => {
    setBusyCall(applicant.id);
    setActionMsg(null);
    try {
      await callToSelection(applicant.id);
      setActionMsg({ type: 'ok', text: `${applicant.fullName} dipanggil ke tahap seleksi.` });
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal memanggil ke seleksi.' });
    } finally {
      setBusyCall(null);
    }
  };

  const handleHire = async (applicant: Applicant) => {
    setBusyHire(applicant.id);
    setActionMsg(null);
    try {
      const employee = await hireApplicant(applicant.id);
      setActionMsg({ type: 'ok', text: `${applicant.fullName} berhasil dijadikan karyawan.` });
      await load();
      navigate(`/karyawan/${employee.id}`);
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menjadikan karyawan.' });
    } finally {
      setBusyHire(null);
    }
  };

  const handleOpenOlModal = (applicant: Applicant) => {
    setOlApplicant(applicant);
    setOlPosition(vacancy?.position ?? '');
    setOlSalary('');
    setOlStartDate('');
    setOlBody('');
    setOlError('');
    setShowOlModal(true);
  };

  const handleCreateOl = async () => {
    if (!olApplicant) return;
    setCreatingOl(true);
    setOlError('');
    try {
      const ol = await createOl({
        applicantId: olApplicant.id,
        position: olPosition.trim(),
        salary: Number(olSalary),
        startDate: olStartDate || undefined,
        body: olBody.trim(),
      });
      setShowOlModal(false);
      navigate(`/offering-letters/${ol.id}`);
    } catch (e) {
      setOlError(e instanceof ApiError ? e.message : 'Gagal membuat Offering Letter.');
    } finally {
      setCreatingOl(false);
    }
  };

  const handleOpenSelectionModal = async (applicant: Applicant) => {
    setSelectionApplicant(applicant);
    setSelectionRecords([]);
    setSelectionError('');
    setSelectionStage('competency_test');
    setSelectionResult('pass');
    setSelectionNotes('');
    setSelectionLoading(true);
    try {
      const res = await getSelectionRecords(applicant.id);
      setSelectionRecords(res.items);
    } catch (e) {
      setSelectionError(e instanceof ApiError ? e.message : 'Gagal memuat riwayat seleksi.');
    } finally {
      setSelectionLoading(false);
    }
  };

  const handleSaveSelection = async () => {
    if (!selectionApplicant) return;
    setSavingSelection(true);
    setSelectionError('');
    try {
      const updated = await recordSelectionResult(
        selectionApplicant.id,
        selectionStage,
        selectionResult,
        selectionNotes.trim() || undefined,
      );
      setSelectionNotes('');
      // Muat ulang riwayat dan daftar pelamar
      const [res] = await Promise.all([
        getSelectionRecords(selectionApplicant.id),
        load(),
      ]);
      setSelectionRecords(res.items);
      // Jika kandidat sudah pindah status (not_selected/offer_pending), tutup modal
      if (updated.status !== 'selection') {
        setSelectionApplicant(null);
        setActionMsg({ type: 'ok', text: `Hasil seleksi ${selectionApplicant.fullName} disimpan.` });
      } else {
        // Update objek selectionApplicant agar tombol aksi tetap konsisten
        setSelectionApplicant(updated);
      }
    } catch (e) {
      setSelectionError(e instanceof ApiError ? e.message : 'Gagal menyimpan hasil seleksi.');
    } finally {
      setSavingSelection(false);
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

  if (loading) return <p className="text-sm text-caption">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!vacancy) return null;

  const selectionStatuses = new Set(['shortlisted', 'selection', 'offer_pending', 'not_selected', 'offered', 'accepted', 'declined', 'hired']);

  const newApplicants            = applicants.filter((a) => a.status === 'new');
  const formSubmittedApplicants  = applicants.filter((a) => a.status === 'form_submitted');
  const selectionApplicants      = applicants.filter((a) => selectionStatuses.has(a.status));
  const otherApplicants          = applicants.filter(
    (a) => a.status !== 'new' && a.status !== 'form_submitted' && !selectionStatuses.has(a.status),
  );

  return (
    <div className="space-y-5">
      <Link
        to={currentUser?.role === 'manajer' ? '/kandidat' : '/lowongan'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-caption hover:text-body"
      >
        <ArrowLeft size={15} /> {currentUser?.role === 'manajer' ? 'Kandidat' : 'Daftar Lowongan'}
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
            {currentUser?.role === 'hr' && vacancy.status === 'open' && (
              <button
                className="btn-danger !py-1.5 text-xs"
                disabled={busy === 'close'}
                onClick={() => setConfirmClose(true)}
              >
                {busy === 'close' ? 'Menutup...' : 'Tutup Lowongan'}
              </button>
            )}
            {currentUser?.role === 'hr' && vacancy.status === 'closed' && (
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
            {currentUser?.role === 'hr' && vacancy.status === 'archived' && (
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

        {vacancy.status === 'open' && currentUser?.role === 'hr' && (
          <div className="flex items-center gap-3 rounded-xl bg-subtle px-4 py-3">
            <span className="min-w-0 flex-1 break-all font-mono text-xs text-caption">{applyUrl}</span>
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
        <h2 className="text-sm font-semibold text-body">
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
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    {['Nama', 'Email', 'Nomor HP', 'Tanggal Daftar', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {newApplicants.map((a) => (
                    <tr
                      key={a.id}
                      className="cursor-pointer transition-colors hover:bg-subtle"
                      onClick={() => setSelected(a)}
                    >
                      <td className="td font-medium text-ink">{a.fullName}</td>
                      <td className="td text-caption">{a.email}</td>
                      <td className="td text-caption">{a.phone}</td>
                      <td className="td text-xs text-caption">
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
        <h2 className="text-sm font-semibold text-body">
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
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    {['Nama', 'Email', 'Tanggal Submit', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formSubmittedApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-subtle">
                      <td className="td font-medium text-ink">{a.fullName}</td>
                      <td className="td text-caption">{a.email}</td>
                      <td className="td text-xs text-caption">
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

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-body">
          Kandidat Shortlist &amp; Seleksi ({selectionApplicants.length})
        </h2>
        <div className="card !p-0 overflow-hidden">
          {selectionApplicants.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={22} />}
              title="Belum ada kandidat"
              description="Kandidat yang di-shortlist oleh CEO akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    {['Nama', 'Email', 'Status', 'Track', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selectionApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-subtle">
                      <td className="td font-medium text-ink">{a.fullName}</td>
                      <td className="td text-caption">{a.email}</td>
                      <td className="td">
                        <Badge variant={APPLICANT_BADGE[a.status] ?? 'default'}>
                          {APPLICANT_STATUS_LABELS[a.status]}
                        </Badge>
                      </td>
                      <td className="td text-xs text-caption">
                        {a.selectionTrack === 'fast'
                          ? 'Fast'
                          : a.selectionTrack === 'normal'
                            ? 'Normal'
                            : '-'}
                      </td>
                      <td className="td text-right">
                        {a.status === 'shortlisted' && (currentUser?.role === 'hr' || currentUser?.role === 'super_admin') && (
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                            disabled={busyCall === a.id}
                            onClick={() => void handleCallToSelection(a)}
                          >
                            {busyCall === a.id ? 'Memproses...' : 'Panggil ke Seleksi'}
                          </button>
                        )}
                        {a.status === 'selection' && (currentUser?.role === 'hr' || currentUser?.role === 'super_admin') && (
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                            onClick={() => void handleOpenSelectionModal(a)}
                          >
                            <ListChecks size={13} /> Catat Hasil
                          </button>
                        )}
                        {a.status === 'offer_pending' && currentUser?.role === 'hr' && (
                          olMap[a.id] ? (
                            <Link
                              to={`/offering-letters/${olMap[a.id].id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              Lihat OL
                            </Link>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                              onClick={() => handleOpenOlModal(a)}
                            >
                              Buat OL
                            </button>
                          )
                        )}
                        {a.status === 'offer_pending' && currentUser?.role === 'super_admin' && (
                          <Link
                            to="/offering-letters"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            Cek OL
                          </Link>
                        )}
                        {a.status === 'accepted' && currentUser?.role === 'hr' && (
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                            disabled={busyHire === a.id}
                            onClick={() => void handleHire(a)}
                          >
                            {busyHire === a.id ? 'Memproses...' : 'Jadikan Karyawan'}
                          </button>
                        )}
                        {a.status === 'not_selected' && (
                          <span className="text-xs text-caption">Tidak dipilih</span>
                        )}
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
          <h2 className="text-sm font-semibold text-body">Riwayat Pelamar</h2>
          <div className="card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-line bg-subtle">
                  <tr>
                    {['Nama', 'Email', 'Status'].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {otherApplicants.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-subtle">
                      <td className="td font-medium text-ink">{a.fullName}</td>
                      <td className="td text-caption">{a.email}</td>
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
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-subtle p-4">
              <div>
                <p className="text-xs text-caption">Nama Lengkap</p>
                <p className="mt-0.5 font-semibold text-ink">{selected.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-caption">Tanggal Daftar</p>
                <p className="mt-0.5 font-semibold text-ink">
                  {new Date(selected.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-caption">Email</p>
                <p className="mt-0.5 text-sm text-body">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-caption">Nomor HP</p>
                <p className="mt-0.5 text-sm text-body">{selected.phone}</p>
              </div>
            </div>

            {/* Pesan dari pelamar */}
            {selected.message && (
              <div className="rounded-xl border border-line bg-subtle px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-caption">Pesan dari Pelamar</p>
                <p className="whitespace-pre-wrap text-sm text-body">{selected.message}</p>
              </div>
            )}

            {/* Berkas */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-caption">Berkas Lamaran</p>
              <div className="flex flex-col gap-2">
                {selected.hasCv && (
                  <button
                    onClick={() => void handleOpenFile('cv')}
                    disabled={fileLoading === 'cv'}
                    className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium text-body transition-colors hover:bg-subtle disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20">
                      <FileText size={18} />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block">Curriculum Vitae (CV)</span>
                      <span className="text-xs text-caption">PDF</span>
                    </span>
                    <Download size={15} className="text-caption" />
                    {fileLoading === 'cv' && <span className="text-xs text-caption">Membuka...</span>}
                  </button>
                )}
                {selected.hasPortfolio && (
                  <button
                    onClick={() => void handleOpenFile('portfolio')}
                    disabled={fileLoading === 'portfolio'}
                    className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium text-body transition-colors hover:bg-subtle disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/20">
                      <FileText size={18} />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block">Portofolio</span>
                      <span className="text-xs text-caption">PDF</span>
                    </span>
                    <Download size={15} className="text-caption" />
                    {fileLoading === 'portfolio' && <span className="text-xs text-caption">Membuka...</span>}
                  </button>
                )}
                {!selected.hasCv && !selected.hasPortfolio && (
                  <p className="text-sm text-caption">Tidak ada berkas tersedia.</p>
                )}
              </div>
            </div>

            {/* Tombol aksi - hanya HR */}
            {selected.status === 'new' && currentUser?.role === 'hr' && (
              <div className="flex gap-2 border-t border-line pt-4">
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
        userRole={currentUser?.role}
        onShortlist={() => void handleShortlist()}
        shortlisting={shortlisting}
      />

      <FileViewerModal
        open={formViewer !== null}
        onClose={closeFormViewer}
        blobUrl={formViewer?.blobUrl ?? null}
        title={formViewer?.title ?? ''}
        filename={formViewer?.filename}
        loading={false}
      />

      {/* Modal pencatatan hasil seleksi */}
      <Modal
        open={selectionApplicant !== null}
        onClose={() => setSelectionApplicant(null)}
        title={`Hasil Seleksi - ${selectionApplicant?.fullName ?? ''}`}
        size="md"
      >
        {selectionApplicant && (
          <div className="space-y-5">
            {selectionError && <Alert variant="error">{selectionError}</Alert>}

            {/* Riwayat catatan */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-caption">
                Riwayat Seleksi
              </p>
              {selectionLoading ? (
                <p className="text-sm text-caption">Memuat...</p>
              ) : selectionRecords.length === 0 ? (
                <p className="text-sm text-caption">Belum ada catatan seleksi.</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line">
                  {selectionRecords.map((rec) => (
                    <div key={rec.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {STAGE_LABELS[rec.stage] ?? rec.stage}
                        </p>
                        {rec.notes && (
                          <p className="mt-0.5 text-xs text-caption">{rec.notes}</p>
                        )}
                        <p className="mt-0.5 text-xs text-caption">
                          {new Date(rec.recordedAt).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant={rec.result === 'pass' ? 'green' : 'red'}>
                        {RESULT_LABELS[rec.result] ?? rec.result}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form tambah catatan baru - hanya jika status masih selection */}
            {selectionApplicant.status === 'selection' && (
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-caption">
                  Tambah Catatan Baru
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-body">
                      Tahap
                    </label>
                    <select
                      className="field-input"
                      value={selectionStage}
                      onChange={(e) => setSelectionStage(e.target.value as 'competency_test' | 'interview')}
                    >
                      <option value="competency_test">Tes Kompetensi</option>
                      <option value="interview">Wawancara</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-body">
                      Hasil
                    </label>
                    <select
                      className="field-input"
                      value={selectionResult}
                      onChange={(e) => setSelectionResult(e.target.value as 'pass' | 'fail')}
                    >
                      <option value="pass">Lulus</option>
                      <option value="fail">Tidak Lulus</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-body">
                    Catatan (opsional)
                  </label>
                  <textarea
                    className="field-input min-h-[80px] resize-y"
                    placeholder="Tuliskan catatan singkat tentang hasil seleksi..."
                    value={selectionNotes}
                    onChange={(e) => setSelectionNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectionApplicant(null)}
                  >
                    Batal
                  </button>
                  <button
                    className="btn-primary"
                    disabled={savingSelection}
                    onClick={() => void handleSaveSelection()}
                  >
                    {savingSelection ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}

            {selectionApplicant.status !== 'selection' && (
              <div className="flex justify-end border-t border-line pt-4">
                <button className="btn-secondary" onClick={() => setSelectionApplicant(null)}>Tutup</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Tutup Lowongan?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-caption">
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
          <p className="text-sm text-caption">
            Lowongan akan diarsipkan. Status berubah ke <strong className="text-body">Diarsipkan</strong>{' '}
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
          <p className="text-sm text-caption">
            Lamaran dari <strong className="text-body">{confirmReject?.fullName}</strong> akan ditolak
            dan email penolakan akan dikirim secara otomatis.
            Data pelamar akan <strong className="text-body">dihapus permanen</strong> dari server.
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

      {/* Modal buat OL */}
      <Modal
        open={showOlModal}
        onClose={() => setShowOlModal(false)}
        title={`Buat Offering Letter - ${olApplicant?.fullName ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {olError && <Alert variant="error">{olError}</Alert>}
          <div>
            <label className="field-label">Posisi</label>
            <input
              className="field-input"
              type="text"
              value={olPosition}
              onChange={(e) => setOlPosition(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Gaji</label>
            <RupiahInput
              value={olSalary}
              onChange={setOlSalary}
            />
          </div>
          <div>
            <label className="field-label">Tanggal Mulai (opsional)</label>
            <input
              className="field-input"
              type="date"
              value={olStartDate}
              onChange={(e) => setOlStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Isi Surat</label>
            <textarea
              className="field-input min-h-[140px] resize-y"
              placeholder="Tuliskan isi Offering Letter di sini..."
              value={olBody}
              onChange={(e) => setOlBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button className="btn-secondary" onClick={() => setShowOlModal(false)}>Batal</button>
            <button
              className="btn-primary"
              disabled={creatingOl}
              onClick={() => void handleCreateOl()}
            >
              {creatingOl ? 'Membuat...' : 'Buat OL'}
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
          <p className="text-sm text-caption">
            Semua data pelamar (CSV + berkas CV dan portofolio) akan dikemas dalam satu file ZIP dan diunduh.
            Setelah unduhan selesai, <strong className="text-body">seluruh data pelamar dan lowongan ini akan dihapus permanen dari server</strong>.
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
