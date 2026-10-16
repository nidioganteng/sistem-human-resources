import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { Modal } from '@/shared/ui/Modal';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/services/api';
import { getOl, updateOl, submitOl, approveOl, reviseOl, sendOl } from './olService';
import { OL_STATUS_LABELS } from './types';
import type { OfferingLetter, OlStatus } from './types';

const STATUS_BADGE: Record<OlStatus, 'default' | 'green' | 'red' | 'amber'> = {
  draft:       'default',
  pending_ceo: 'amber',
  revision:    'amber',
  approved:    'green',
  sent:        'green',
  accepted:    'green',
  declined:    'red',
  expired:     'red',
};

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function OlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const olId = Number(id);

  const [ol, setOl] = useState<OfferingLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Modal edit (HR, draft/revision)
  const [showEdit, setShowEdit] = useState(false);
  const [editPosition, setEditPosition] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editError, setEditError] = useState('');

  // Modal submit ke CEO
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Modal approve (CEO)
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);

  // Modal revisi (CEO)
  const [showRevise, setShowRevise] = useState(false);
  const [reviseComment, setReviseComment] = useState('');
  const [reviseError, setReviseError] = useState('');

  // Modal kirim ke kandidat (HR)
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getOl(olId);
      setOl(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [olId]);

  const openEditModal = () => {
    if (!ol) return;
    setEditPosition(ol.position);
    setEditSalary(String(ol.salary));
    setEditStartDate(ol.startDate ?? '');
    setEditBody(ol.body);
    setEditError('');
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!ol) return;
    setBusy(true);
    setEditError('');
    try {
      const updated = await updateOl(ol.id, {
        position: editPosition.trim(),
        salary: Number(editSalary),
        startDate: editStartDate || undefined,
        body: editBody.trim(),
      });
      setOl(updated);
      setShowEdit(false);
      setActionMsg({ type: 'ok', text: 'Offering Letter berhasil diperbarui.' });
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : 'Gagal menyimpan perubahan.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!ol) return;
    setBusy(true);
    setShowConfirmSubmit(false);
    setActionMsg(null);
    try {
      const updated = await submitOl(ol.id);
      setOl(updated);
      setActionMsg({ type: 'ok', text: 'Offering Letter telah diajukan ke CEO.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal mengajukan.' });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!ol) return;
    setBusy(true);
    setShowConfirmApprove(false);
    setActionMsg(null);
    try {
      const updated = await approveOl(ol.id);
      setOl(updated);
      setActionMsg({ type: 'ok', text: 'Offering Letter telah disetujui.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal menyetujui.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRevise = async () => {
    if (!ol) return;
    if (!reviseComment.trim()) {
      setReviseError('Catatan revisi wajib diisi.');
      return;
    }
    setBusy(true);
    setReviseError('');
    try {
      const updated = await reviseOl(ol.id, reviseComment.trim());
      setOl(updated);
      setShowRevise(false);
      setReviseComment('');
      setActionMsg({ type: 'ok', text: 'Permintaan revisi telah dikirim ke HR.' });
    } catch (e) {
      setReviseError(e instanceof ApiError ? e.message : 'Gagal mengirim revisi.');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!ol) return;
    setBusy(true);
    setShowConfirmSend(false);
    setActionMsg(null);
    try {
      const updated = await sendOl(ol.id, window.location.origin);
      setOl(updated);
      setActionMsg({ type: 'ok', text: 'Offering Letter berhasil dikirim ke kandidat via email.' });
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gagal mengirim email.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!ol) return null;

  const isHr = user?.role === 'hr';
  const isCeo = user?.role === 'super_admin';
  const canEdit = isHr && (ol.status === 'draft' || ol.status === 'revision');
  const canSubmit = isHr && (ol.status === 'draft' || ol.status === 'revision');
  const canSend = isHr && ol.status === 'approved';
  const canApprove = isCeo && ol.status === 'pending_ceo';
  const canRevise = isCeo && ol.status === 'pending_ceo';

  return (
    <div className="space-y-5">
      <button
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} /> Kembali
      </button>

      {actionMsg && (
        <Alert variant={actionMsg.type === 'ok' ? 'success' : 'error'}>
          {actionMsg.text}
        </Alert>
      )}

      <div className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{ol.position}</h1>
            <p className="page-subtitle mt-0.5">Offering Letter #{ol.id}</p>
          </div>
          <Badge variant={STATUS_BADGE[ol.status]}>
            {OL_STATUS_LABELS[ol.status]}
          </Badge>
        </div>

        {ol.status === 'revision' && ol.revisionComment && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Catatan Revisi dari CEO
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">{ol.revisionComment}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-[#0c1018]">
            <p className="text-xs text-slate-500 dark:text-slate-500">Posisi</p>
            <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{ol.position}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-[#0c1018]">
            <p className="text-xs text-slate-500 dark:text-slate-500">Gaji</p>
            <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{formatRupiah(ol.salary)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-[#0c1018]">
            <p className="text-xs text-slate-500 dark:text-slate-500">Tanggal Mulai</p>
            <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
              {ol.startDate ? formatDate(ol.startDate) : '-'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-[#0c1018]">
            <p className="text-xs text-slate-500 dark:text-slate-500">Tanda Tangan</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              HR: {ol.hasHrSignature ? 'Ada' : 'Belum'} &nbsp;&middot;&nbsp; CEO: {ol.hasCeoSignature ? 'Ada' : 'Belum'}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Isi Surat
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1c2333] dark:bg-[#0c1018]">
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{ol.body}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Linimasa
          </p>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>Dibuat: {formatDateTime(ol.createdAt)}</li>
            {ol.sentAt && <li>Dikirim ke kandidat: {formatDateTime(ol.sentAt)}</li>}
            {ol.respondBefore && <li>Batas respons: {formatDate(ol.respondBefore)}</li>}
            {ol.respondedAt && <li>Direspons: {formatDateTime(ol.respondedAt)}</li>}
          </ul>
        </div>

        {(canEdit || canSubmit || canSend || canApprove || canRevise) && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-[#1c2333]">
            {canEdit && (
              <button className="btn-secondary" onClick={openEditModal}>
                Edit OL
              </button>
            )}
            {canSubmit && (
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => setShowConfirmSubmit(true)}
              >
                Ajukan ke CEO
              </button>
            )}
            {canSend && (
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => setShowConfirmSend(true)}
              >
                {busy ? 'Mengirim...' : 'Kirim ke Kandidat'}
              </button>
            )}
            {canApprove && (
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => setShowConfirmApprove(true)}
              >
                Setujui
              </button>
            )}
            {canRevise && (
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => { setReviseComment(''); setReviseError(''); setShowRevise(true); }}
              >
                Minta Revisi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Edit OL */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Offering Letter" size="lg">
        <div className="space-y-4">
          {editError && <Alert variant="error">{editError}</Alert>}
          <div>
            <label className="field-label">Posisi</label>
            <input
              className="field-input"
              type="text"
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Gaji (Rp)</label>
            <input
              className="field-input"
              type="number"
              min={0}
              value={editSalary}
              onChange={(e) => setEditSalary(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Tanggal Mulai (opsional)</label>
            <input
              className="field-input"
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Isi Surat</label>
            <textarea
              className="field-input min-h-[160px] resize-y"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-[#1c2333]">
            <button className="btn-secondary" onClick={() => setShowEdit(false)}>Batal</button>
            <button className="btn-primary" disabled={busy} onClick={() => void handleSaveEdit()}>
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal konfirmasi ajukan ke CEO */}
      <Modal open={showConfirmSubmit} onClose={() => setShowConfirmSubmit(false)} title="Ajukan ke CEO?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Offering Letter akan dikirim ke CEO untuk ditinjau dan disetujui.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowConfirmSubmit(false)}>Batal</button>
            <button className="btn-primary" disabled={busy} onClick={() => void handleSubmit()}>
              {busy ? 'Mengajukan...' : 'Ya, Ajukan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal konfirmasi approve (CEO) */}
      <Modal open={showConfirmApprove} onClose={() => setShowConfirmApprove(false)} title="Setujui Offering Letter?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Tanda tangan CEO akan dilekatkan dan OL siap dikirim ke kandidat oleh HR.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowConfirmApprove(false)}>Batal</button>
            <button className="btn-primary" disabled={busy} onClick={() => void handleApprove()}>
              {busy ? 'Menyetujui...' : 'Ya, Setujui'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal revisi (CEO) */}
      <Modal open={showRevise} onClose={() => setShowRevise(false)} title="Minta Revisi" size="md">
        <div className="space-y-4">
          {reviseError && <Alert variant="error">{reviseError}</Alert>}
          <div>
            <label className="field-label">Catatan Revisi</label>
            <textarea
              className="field-input min-h-[100px] resize-y"
              placeholder="Tuliskan poin-poin yang perlu diperbaiki..."
              value={reviseComment}
              onChange={(e) => setReviseComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowRevise(false)}>Batal</button>
            <button className="btn-primary" disabled={busy} onClick={() => void handleRevise()}>
              {busy ? 'Mengirim...' : 'Kirim Revisi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal konfirmasi kirim ke kandidat */}
      <Modal open={showConfirmSend} onClose={() => setShowConfirmSend(false)} title="Kirim ke Kandidat?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Email Offering Letter akan dikirim ke kandidat. Kandidat punya waktu 5 hari kerja untuk merespons.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowConfirmSend(false)}>Batal</button>
            <button className="btn-primary" disabled={busy} onClick={() => void handleSend()}>
              {busy ? 'Mengirim...' : 'Ya, Kirim'}
            </button>
          </div>
        </div>
      </Modal>

      <Link to="/offering-letters" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
        <ArrowLeft size={13} /> Daftar Offering Letter
      </Link>
    </div>
  );
}
