import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, FileText, ListChecks, Users } from 'lucide-react';
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
  downloadArchiveAndClear,
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
import { ApplicantReviewPanel } from './ApplicantReviewPanel';
import { FormPelamarModal } from './FormPelamarModal';
import { JobQrCode } from '@/shared/ui/JobQrCode';
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
  const [exportingPdf, setExportingPdf] = useState(false);
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
      setActionMsg({ type: 'ok', text: `Email tautan Form Pelamar masuk antrean pengiriman ke ${applicant.email}.` });
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
      setActionMsg({ type: 'ok', text: `Lamaran ${applicant.fullName} ditolak. Email penolakan masuk antrean pengiriman.` });
      setSelected(null);
      await load();
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menolak.' });
    } finally {
      setBusy(null);
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

  const handleExportPdf = async () => {
    if (!formApplicant || !formDetail) return;
    setExportingPdf(true);
    try {
      const blob = await apiFetchBlob(`/applicants/${formApplicant.id}/pdf`);
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`form-pelamar-${formApplicant.id}.pdf`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch (e) {
      setActionMsg({ type: 'err', text: 'Gagal mengekspor dokumen.' });
    } finally {
      setExportingPdf(false);
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
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal memulai onboarding.' });
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
    setSelectionStage(currentUser?.role === 'pic' || currentUser?.role === 'manajer' ? 'competency_test' : 'interview');
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

  const handleClose = async () => {
    setBusy('close');
    setConfirmClose(false);
    try {
      const updated = await closeVacancy(vacancyId);
      setVacancy(updated);
      if(updated.archiveId&&updated.archiveChecksum){await downloadArchiveAndClear(updated.archiveId,updated.archiveChecksum);await load();}
      setActionMsg({ type: 'ok', text: 'Lowongan ditutup, arsip lengkap diunduh, dan data aktif dibersihkan. Salinan tersedia di Arsip Lowongan.' });
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
      setActionMsg({ type: 'ok', text: 'Lowongan berhasil diarsipkan. Gunakan tombol "Unduh Arsip" di halaman Arsip untuk mengunduh data pelamar.' });
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
      setActionMsg({ type: 'ok', text: 'Arsip berhasil diunduh. Salinan tetap tersedia di Arsip Lowongan.' });
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
                {busy === 'download' ? 'Mengunduh...' : 'Unduh Arsip'}
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

      {vacancy.status === 'open' && currentUser?.role === 'hr' && <JobQrCode url={applyUrl} />}
      {vacancy.status === 'closed' && <Alert variant="info">Pendaftaran lowongan sudah ditutup. Kandidat yang menerima OL dapat dilanjutkan melalui Mulai Onboarding. Data dan penawaran kandidat lain tetap tersimpan sampai proses diselesaikan.</Alert>}
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
                      className={`transition-colors hover:bg-subtle ${selected?.id === a.id ? 'bg-accent-soft' : ''}`}
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
                        <button type="button" aria-expanded={selected?.id === a.id} disabled={typeof busy === 'number'} onClick={() => setSelected(selected?.id === a.id ? null : a)} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50">
                          <FileText size={13} /> {selected?.id === a.id ? 'Tutup Detail' : 'Lihat Berkas'}
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

      {selected && (
        <ApplicantReviewPanel
          key={selected.id}
          applicant={selected}
          canScreen={currentUser?.role === 'hr'}
          busy={busy === selected.id}
          onClose={() => setSelected(null)}
          onApprove={() => void handleApprove(selected)}
          onReject={() => setConfirmReject(selected)}
        />
      )}

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
              description="Kandidat yang di-shortlist oleh tim penilai akan muncul di sini."
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
                        {a.status === 'selection' && (['hr','super_admin','manajer','pic'].includes(currentUser?.role ?? '')) && (
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
                            {busyHire === a.id ? 'Memproses...' : 'Mulai Onboarding'}
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

      <FormPelamarModal
        open={formApplicant !== null}
        applicant={formApplicant}
        detail={formDetail}
        loading={formLoading}
        error={formError}
        photoUrl={photoUrl}
        signatureUrl={signatureUrl}
        onClose={closeFormModal}
        onExportPdf={() => void handleExportPdf()}
        exportingPdf={exportingPdf}
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
                      {(currentUser?.role === 'pic' || currentUser?.role === 'manajer') ? <option value="competency_test">Tes Kompetensi</option> : <option value="interview">Wawancara</option>}
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
            Pendaftaran akan ditutup. Sistem menyiapkan dan mengunduh arsip lengkap, lalu membersihkan data pelamar aktif setelah checksum arsip terverifikasi. Data karyawan, talent pool, riwayat MRF, dan salinan arsip server tetap disimpan.
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
            dan tidak bisa dibuka kembali. Data pelamar dibersihkan melalui menu Arsip Lowongan setelah arsip berhasil diunduh.
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
            Riwayat lamaran tetap tersimpan sampai pembersihan melalui arsip lowongan.
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
        title="Unduh Arsip Data?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-caption">
            Unduh arsip lengkap berisi rekap pelamar, formulir PDF, Offering Letter, dan berkas pendukung.
            Salinan arsip tetap tersedia pada menu Arsip Lowongan.
          </p>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDownload(false)}>Batal</button>
            <button
              className="!bg-amber-500 hover:!bg-amber-600 !text-white btn-primary"
              disabled={busy === 'download'}
              onClick={() => void handleDownloadAndDelete()}
            >
              {busy === 'download' ? 'Mengunduh...' : 'Ya, Unduh Arsip'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
