import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canCreateMrf } from '@/auth/permissions';
import { Alert } from '@/shared/ui/Alert';
import { createMrf, getMrf, updateMrf } from './mrfService';
import type { MrfInput } from './types';

const EMPTY: MrfInput = {
  position: '', responsibilities: '', education: '', skills: '', experience: '',
  headcount: 1, employmentStatus: 'PKWT', selectionTrack: 'normal',
};

export default function MrfFormPage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<MrfInput>(EMPTY);
  const [loading, setLoading] = useState(editId !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState<string | null>(null);

  useEffect(() => {
    if (editId === null) return;
    getMrf(editId)
      .then((m) => {
        if (!m.canEdit) { navigate(`/mrf/${editId}`, { replace: true }); return; }
        setForm({
          position: m.position, responsibilities: m.responsibilities, education: m.education,
          skills: m.skills, experience: m.experience, headcount: m.headcount,
          employmentStatus: m.employmentStatus, selectionTrack: m.selectionTrack,
        });
        const last = m.history?.filter((h) => h.action === 'revise').at(-1);
        if (m.status === 'revision' && last?.comment) setRevisionNote(`${last.actorName}: ${last.comment}`);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  if (!user) return null;
  if (editId === null && !canCreateMrf(user.role)) return <Navigate to="/mrf" replace />;

  const set = <K extends keyof MrfInput>(k: K, v: MrfInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (submit: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const m = editId === null ? await createMrf(form, submit) : await updateMrf(editId, form, submit);
      navigate(`/mrf/${m.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void save(true); };

  if (loading) return <div className="text-sm text-caption">Memuat...</div>;

  const route = user.role === 'pic' ? 'Manajer divisi, lalu CEO' : 'langsung ke CEO';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Link to="/mrf" className="inline-flex items-center gap-1.5 text-sm font-medium text-caption hover:text-body dark:hover:text-white">
          <ArrowLeft size={15} /> Daftar MRF
        </Link>
        <h1 className="page-title mt-2">{editId === null ? 'Buat MRF' : 'Ubah MRF'}</h1>
        <p className="page-subtitle mt-0.5">
          Setelah diajukan, MRF diperiksa oleh {route}.
        </p>
      </div>

      {revisionNote && (
        <Alert variant="warning" title="Catatan revisi">
          {revisionNote}
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="card grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="position">Posisi *</label>
          <input id="position" required maxLength={150} className="field-input" value={form.position}
            onChange={(e) => set('position', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="resp">Tanggung jawab utama *</label>
          <textarea id="resp" required rows={4} className="field-input" value={form.responsibilities}
            onChange={(e) => set('responsibilities', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="edu">Kualifikasi: pendidikan *</label>
          <textarea id="edu" required rows={3} className="field-input" value={form.education}
            onChange={(e) => set('education', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="skills">Kualifikasi: kemampuan *</label>
          <textarea id="skills" required rows={3} className="field-input" value={form.skills}
            onChange={(e) => set('skills', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="exp">Kualifikasi: pengalaman *</label>
          <textarea id="exp" required rows={2} className="field-input" value={form.experience}
            onChange={(e) => set('experience', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="hc">Jumlah kebutuhan (orang) *</label>
          <input id="hc" type="number" min={1} max={100} required className="field-input"
            value={form.headcount} onChange={(e) => set('headcount', Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label" htmlFor="emp">Status kerja *</label>
          <select id="emp" className="field-input" value={form.employmentStatus}
            onChange={(e) => set('employmentStatus', e.target.value as MrfInput['employmentStatus'])}>
            <option value="PKWT">PKWT (kontrak)</option>
            <option value="PKWTT">PKWTT (tetap)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="track">Jalur seleksi *</label>
          <select id="track" className="field-input" value={form.selectionTrack}
            onChange={(e) => set('selectionTrack', e.target.value as MrfInput['selectionTrack'])}>
            <option value="normal">Normal: uji kompetensi, lalu wawancara HRD dan User</option>
            <option value="fast">Fast: langsung wawancara HRD dan User</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Menyimpan...' : 'Simpan dan ajukan'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={(e) => {
            const f = (e.currentTarget.form as HTMLFormElement);
            if (f.reportValidity()) void save(false);
          }}
        >
          Simpan sebagai draft
        </button>
        <Link to={editId ? `/mrf/${editId}` : '/mrf'} className="btn-secondary">
          Batal
        </Link>
      </div>
    </form>
  );
}
