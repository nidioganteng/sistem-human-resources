import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Upload } from 'lucide-react';
import { getFormPelamarInfo, submitFormPelamar, type FormPelamarInfo } from './formPelamarService';
import { RupiahInput } from '@/shared/ui/RupiahInput';

// ── Tipe data form ────────────────────────────────────────────────────────────

interface PendidikanFormal {
  tingkat: string;
  nama_sekolah: string;
  jurusan: string;
  tahun_lulus: string;
  nilai: string;
}

interface PengalamanKerja {
  nama_perusahaan: string;
  periode_dari: string;
  periode_hingga: string;
  jabatan: string;
  gaji_terakhir: string;
}

interface PengalamanOrganisasi {
  nama_organisasi: string;
  periode: string;
  jabatan: string;
  tugas: string;
}

interface FormData {
  nama_panggilan: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat_tinggal: string;
  no_identitas: string;
  agama: string;
  status_perkawinan: string;
  kewarganegaraan: string;
  pendidikan_formal: PendidikanFormal[];
  pendidikan_non_formal: string[];
  pengalaman_kerja: PengalamanKerja[];
  penguasaan_bahasa: string[];
  soft_skill: string[];
  pengalaman_organisasi: PengalamanOrganisasi[];
  sumber_info: string;
  tentang_gsg: string;
  alasan_bergabung: string;
  misi_kontribusi: string;
  gaji_harapan: string;
  kota_tanda_tangan: string;
}

const SOFT_SKILL_LIST = [
  'Kepemimpinan',
  'Pengambilan Keputusan',
  'Komunikasi Publik',
  'Adaptif',
  'Problem Solving',
  'Manajemen Waktu',
];

const STATUS_PERKAWINAN = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];

type PageState = 'loading' | 'form' | 'success' | 'error';
type FormStep = 1 | 2 | 3 | 4 | 5;

const STEPS: { label: string }[] = [
  { label: 'Identitas' },
  { label: 'Pendidikan' },
  { label: 'Pengalaman' },
  { label: 'Kompetensi' },
  { label: 'Kirim' },
];

// ── Background ────────────────────────────────────────────────────────────────

function BG({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 35%, #2563eb 60%, #0ea5e9 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-2xl" style={{ animationDelay: '0s' }} />
        <div className="animate-drift absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="animate-drift absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl" style={{ animationDelay: '1.5s' }} />
        <div className="animate-float-slow absolute top-16 left-10 h-14 w-14 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm" style={{ animationDelay: '0s' }} />
        <div className="animate-float-medium absolute top-32 right-16 h-10 w-10 rotate-45 border border-white/20 bg-white/10" style={{ animationDelay: '1s' }} />
        <div className="animate-float-slow absolute bottom-40 left-16 h-8 w-8 rounded-full border border-white/20 bg-white/10" style={{ animationDelay: '2s' }} />
        <div className="animate-float-medium absolute bottom-24 right-12 h-16 w-16 rounded-2xl border border-white/15 bg-white/[0.08]" style={{ animationDelay: '0.5s' }} />
        <svg className="absolute right-0 top-0 h-full opacity-10" viewBox="0 0 400 800" fill="none">
          <circle cx="350" cy="150" r="120" stroke="white" strokeWidth="1" />
          <circle cx="350" cy="150" r="200" stroke="white" strokeWidth="0.5" />
          <circle cx="50" cy="650" r="90" stroke="white" strokeWidth="1" />
          <circle cx="50" cy="650" r="160" stroke="white" strokeWidth="0.5" />
        </svg>
        <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: FormStep }) {
  return (
    <div className="flex items-start">
      {STEPS.map((s, i) => {
        const idx = (i + 1) as FormStep;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={s.label} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
                  done
                    ? 'bg-brand-500 text-white'
                    : active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/40 ring-4 ring-brand-100'
                    : 'border-2 border-slate-200 bg-white text-slate-400',
                ].join(' ')}
              >
                {done ? <CheckCircle2 size={16} /> : idx}
              </div>
              <p
                className={[
                  'w-14 text-center text-[11px] font-semibold leading-tight transition-colors',
                  active ? 'text-brand-600' : done ? 'text-slate-500' : 'text-slate-400',
                ].join(' ')}
              >
                {s.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'mx-1 mt-[18px] h-0.5 flex-1 transition-all duration-300',
                  done ? 'bg-brand-400' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 sm:px-8">
      <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-brand-600">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {children}{required && <span className="ml-0.5 text-red-500 normal-case font-bold">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

// ── Canvas tanda tangan ────────────────────────────────────────────────────────

function SignatureCanvas({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onCapture(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onCapture('');
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-300">Tanda tangan di sini</p>
          </div>
        )}
      </div>
      <button type="button" onClick={clear} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">
        Hapus tanda tangan
      </button>
    </div>
  );
}

// ── Komponen utama ────────────────────────────────────────────────────────────

export default function FormPelamarPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [info, setInfo] = useState<FormPelamarInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<FormStep>(1);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    nama_panggilan: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    alamat_tinggal: '',
    no_identitas: '',
    agama: '',
    status_perkawinan: '',
    kewarganegaraan: 'WNI',
    pendidikan_formal: [{ tingkat: '', nama_sekolah: '', jurusan: '', tahun_lulus: '', nilai: '' }],
    pendidikan_non_formal: [],
    pengalaman_kerja: [],
    penguasaan_bahasa: [''],
    soft_skill: [],
    pengalaman_organisasi: [],
    sumber_info: '',
    tentang_gsg: '',
    alasan_bergabung: '',
    misi_kontribusi: '',
    gaji_harapan: '',
    kota_tanda_tangan: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureTab, setSignatureTab] = useState<'gambar' | 'upload'>('gambar');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    getFormPelamarInfo(token)
      .then((d) => { setInfo(d); setPageState('form'); })
      .catch((e: Error) => { setLoadError(e.message); setPageState('error'); });
  }, [token]);

  const scrollToTop = () => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Pendidikan formal
  const addPendidikanFormal = () =>
    setField('pendidikan_formal', [...formData.pendidikan_formal, { tingkat: '', nama_sekolah: '', jurusan: '', tahun_lulus: '', nilai: '' }]);
  const updatePendidikanFormal = (idx: number, key: keyof PendidikanFormal, val: string) =>
    setField('pendidikan_formal', formData.pendidikan_formal.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const removePendidikanFormal = (idx: number) => {
    if (formData.pendidikan_formal.length <= 1) return;
    setField('pendidikan_formal', formData.pendidikan_formal.filter((_, i) => i !== idx));
  };

  // ── Pendidikan non formal
  const addPendidikanNonFormal = () => setField('pendidikan_non_formal', [...formData.pendidikan_non_formal, '']);
  const updatePendidikanNonFormal = (idx: number, val: string) =>
    setField('pendidikan_non_formal', formData.pendidikan_non_formal.map((v, i) => i === idx ? val : v));
  const removePendidikanNonFormal = (idx: number) =>
    setField('pendidikan_non_formal', formData.pendidikan_non_formal.filter((_, i) => i !== idx));

  // ── Pengalaman kerja
  const addPengalamanKerja = () =>
    setField('pengalaman_kerja', [...formData.pengalaman_kerja, { nama_perusahaan: '', periode_dari: '', periode_hingga: '', jabatan: '', gaji_terakhir: '' }]);
  const updatePengalamanKerja = (idx: number, key: keyof PengalamanKerja, val: string) =>
    setField('pengalaman_kerja', formData.pengalaman_kerja.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const removePengalamanKerja = (idx: number) =>
    setField('pengalaman_kerja', formData.pengalaman_kerja.filter((_, i) => i !== idx));

  // ── Bahasa
  const addBahasa = () => setField('penguasaan_bahasa', [...formData.penguasaan_bahasa, '']);
  const updateBahasa = (idx: number, val: string) =>
    setField('penguasaan_bahasa', formData.penguasaan_bahasa.map((v, i) => i === idx ? val : v));
  const removeBahasa = (idx: number) => {
    if (formData.penguasaan_bahasa.length <= 1) return;
    setField('penguasaan_bahasa', formData.penguasaan_bahasa.filter((_, i) => i !== idx));
  };

  // ── Soft skill
  const toggleSoftSkill = (skill: string) => {
    const c = formData.soft_skill;
    setField('soft_skill', c.includes(skill) ? c.filter((s) => s !== skill) : [...c, skill]);
  };

  // ── Organisasi
  const addOrganisasi = () =>
    setField('pengalaman_organisasi', [...formData.pengalaman_organisasi, { nama_organisasi: '', periode: '', jabatan: '', tugas: '' }]);
  const updateOrganisasi = (idx: number, key: keyof PengalamanOrganisasi, val: string) =>
    setField('pengalaman_organisasi', formData.pengalaman_organisasi.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const removeOrganisasi = (idx: number) =>
    setField('pengalaman_organisasi', formData.pengalaman_organisasi.filter((_, i) => i !== idx));

  // ── Foto
  const handlePhotoChange = (file: File | null) => {
    if (!file) { setPhotoFile(null); return; }
    if (!file.type.startsWith('image/')) {
      setFieldErrors((p) => ({ ...p, photo: 'File foto harus berupa gambar (JPEG, PNG, atau WebP).' }));
      return;
    }
    if (file.size > 500 * 1024) {
      setFieldErrors((p) => ({ ...p, photo: 'Ukuran foto melebihi batas 500 KB.' }));
      return;
    }
    setFieldErrors((p) => { const n = { ...p }; delete n.photo; return n; });
    setPhotoFile(file);
  };

  // ── Tanda tangan upload
  const handleSignatureFileChange = (file: File | null) => {
    if (!file) { setSignatureFile(null); return; }
    if (!file.type.startsWith('image/')) {
      setFieldErrors((p) => ({ ...p, signature: 'File tanda tangan harus berupa gambar.' }));
      return;
    }
    if (file.size > 500 * 1024) {
      setFieldErrors((p) => ({ ...p, signature: 'Ukuran tanda tangan melebihi batas 500 KB.' }));
      return;
    }
    setFieldErrors((p) => { const n = { ...p }; delete n.signature; return n; });
    setSignatureFile(file);
  };

  // ── Validasi per langkah
  const validateStep = (s: FormStep): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!formData.nama_panggilan.trim()) errs.nama_panggilan = 'Nama panggilan wajib diisi.';
      if (!formData.tempat_lahir.trim()) errs.tempat_lahir = 'Tempat lahir wajib diisi.';
      if (!formData.tanggal_lahir) errs.tanggal_lahir = 'Tanggal lahir wajib diisi.';
      if (!formData.alamat_tinggal.trim()) errs.alamat_tinggal = 'Alamat tinggal wajib diisi.';
      if (!formData.no_identitas.trim()) errs.no_identitas = 'Nomor identitas KTP/SIM wajib diisi.';
      if (!formData.agama.trim()) errs.agama = 'Agama wajib diisi.';
      if (!formData.status_perkawinan) errs.status_perkawinan = 'Status perkawinan wajib dipilih.';
    }

    if (s === 2) {
      const hasValidFormal = formData.pendidikan_formal.some((r) => r.tingkat.trim() && r.nama_sekolah.trim());
      if (!hasValidFormal) errs.pendidikan_formal = 'Isi minimal satu data pendidikan formal (Tingkat dan Nama Sekolah).';
    }

    if (s === 4) {
      const hasValidBahasa = formData.penguasaan_bahasa.some((b) => b.trim());
      if (!hasValidBahasa) errs.penguasaan_bahasa = 'Isi minimal satu bahasa.';
      if (!formData.sumber_info.trim()) errs.sumber_info = 'Sumber informasi lowongan wajib diisi.';
      if (!formData.tentang_gsg.trim()) errs.tentang_gsg = 'Kolom ini wajib diisi.';
      if (!formData.alasan_bergabung.trim()) errs.alasan_bergabung = 'Kolom ini wajib diisi.';
      if (!formData.misi_kontribusi.trim()) errs.misi_kontribusi = 'Kolom ini wajib diisi.';
      if (!formData.gaji_harapan.trim() || isNaN(Number(formData.gaji_harapan))) {
        errs.gaji_harapan = 'Gaji harapan wajib diisi.';
      }
    }

    if (s === 5) {
      if (!formData.kota_tanda_tangan.trim()) errs.kota_tanda_tangan = 'Kota tanda tangan wajib diisi.';
      const hasSignature = signatureTab === 'gambar' ? signatureDataUrl !== '' : signatureFile !== null;
      if (!hasSignature) errs.signature = 'Tanda tangan wajib dilengkapi.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});
    setStep((s) => Math.min(5, s + 1) as FormStep);
    scrollToTop();
  };

  const goBack = () => {
    setFieldErrors({});
    setStep((s) => Math.max(1, s - 1) as FormStep);
    scrollToTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setSubmitting(true);
    setSubmitError('');

    const fd = new FormData();
    fd.append('nama_panggilan', formData.nama_panggilan.trim());
    fd.append('tempat_lahir', formData.tempat_lahir.trim());
    fd.append('tanggal_lahir', formData.tanggal_lahir);
    fd.append('alamat_tinggal', formData.alamat_tinggal.trim());
    fd.append('no_identitas', formData.no_identitas.trim());
    fd.append('agama', formData.agama.trim());
    fd.append('status_perkawinan', formData.status_perkawinan);
    fd.append('kewarganegaraan', formData.kewarganegaraan.trim() || 'WNI');
    fd.append('pendidikan_formal', JSON.stringify(formData.pendidikan_formal));
    fd.append('pendidikan_non_formal', JSON.stringify(formData.pendidikan_non_formal.filter((v) => v.trim())));
    fd.append('pengalaman_kerja', JSON.stringify(formData.pengalaman_kerja));
    fd.append('penguasaan_bahasa', JSON.stringify(formData.penguasaan_bahasa.filter((v) => v.trim())));
    fd.append('soft_skill', JSON.stringify(formData.soft_skill));
    fd.append('pengalaman_organisasi', JSON.stringify(formData.pengalaman_organisasi));
    fd.append('sumber_info', formData.sumber_info.trim());
    fd.append('tentang_gsg', formData.tentang_gsg.trim());
    fd.append('alasan_bergabung', formData.alasan_bergabung.trim());
    fd.append('misi_kontribusi', formData.misi_kontribusi.trim());
    fd.append('gaji_harapan', formData.gaji_harapan.trim());
    fd.append('kota_tanda_tangan', formData.kota_tanda_tangan.trim());
    if (photoFile) fd.append('photo', photoFile);
    if (signatureTab === 'gambar' && signatureDataUrl) {
      fd.append('signature_data_url', signatureDataUrl);
    } else if (signatureTab === 'upload' && signatureFile) {
      fd.append('signature', signatureFile);
    }

    try {
      await submitFormPelamar(token ?? '', fd);
      setPageState('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            <p className="text-sm text-white/70">Memuat formulir...</p>
          </div>
        </div>
      </BG>
    );
  }

  if (pageState === 'error') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="apply-card w-full max-w-md p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-800">Form Tidak Tersedia</p>
            <p className="text-sm text-slate-500">{loadError}</p>
          </div>
        </div>
      </BG>
    );
  }

  if (pageState === 'success') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="apply-card w-full max-w-md overflow-hidden">
            <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Gaharu Sempana Group</p>
              <p className="text-lg font-bold text-white">Form Pelamar Digital</p>
            </div>
            <div className="px-8 py-10 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Form Berhasil Dikirim!</h1>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Terima kasih, <strong className="text-slate-700">{info?.applicantName}</strong>!
                  Data Anda sudah kami terima untuk posisi{' '}
                  <strong className="text-slate-700">{info?.vacancyPosition}</strong>.
                  Tim HR akan menghubungi Anda untuk langkah selanjutnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </BG>
    );
  }

  // ── Render form ─────────────────────────────────────────────────────────

  return (
    <BG>
      <div className="flex min-h-screen flex-col items-center justify-start px-4 py-10 sm:py-14">

        {/* Kartu utama - satu kartu untuk semua */}
        <div ref={cardRef} className="apply-card w-full max-w-2xl overflow-hidden">

          {/* Header kartu */}
          <div
            className="flex items-center justify-between gap-4 px-8 py-6"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Form Pelamar Digital</p>
              <p className="mt-1 text-xl font-bold leading-tight text-white">{info?.vacancyPosition}</p>
              <p className="mt-0.5 text-sm text-white/60">Divisi {info?.vacancyDivision} &middot; {info?.applicantName}</p>
            </div>
            <img
              src="/logo-gsg.png"
              alt="GSG"
              className="h-10 w-auto shrink-0 object-contain opacity-80"
            />
          </div>

          {/* Step indicator */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-8 py-5">
            <StepIndicator current={step} />
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} noValidate>

            {/* ── STEP 1: Identitas Diri ─────────────────────────── */}
            {step === 1 && (
              <Section title="Identitas Diri">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Nama Lengkap</FieldLabel>
                    <input className="apply-input" value={info?.applicantName ?? ''} disabled />
                  </div>
                  <div>
                    <FieldLabel required>Nama Panggilan</FieldLabel>
                    <input
                      className="apply-input"
                      value={formData.nama_panggilan}
                      onChange={(e) => setField('nama_panggilan', e.target.value)}
                      placeholder="Nama sehari-hari"
                    />
                    <FieldError msg={fieldErrors.nama_panggilan} />
                  </div>
                  <div>
                    <FieldLabel required>Tempat Lahir</FieldLabel>
                    <input
                      className="apply-input"
                      value={formData.tempat_lahir}
                      onChange={(e) => setField('tempat_lahir', e.target.value)}
                      placeholder="Kota tempat lahir"
                    />
                    <FieldError msg={fieldErrors.tempat_lahir} />
                  </div>
                  <div>
                    <FieldLabel required>Tanggal Lahir</FieldLabel>
                    <input
                      type="date"
                      className="apply-input"
                      value={formData.tanggal_lahir}
                      onChange={(e) => setField('tanggal_lahir', e.target.value)}
                    />
                    <FieldError msg={fieldErrors.tanggal_lahir} />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Alamat Tinggal</FieldLabel>
                  <textarea
                    className="apply-input resize-none"
                    rows={3}
                    value={formData.alamat_tinggal}
                    onChange={(e) => setField('alamat_tinggal', e.target.value)}
                    placeholder="Alamat lengkap tempat tinggal saat ini"
                  />
                  <FieldError msg={fieldErrors.alamat_tinggal} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>No. Telp/HP</FieldLabel>
                    <input className="apply-input" value={info?.applicantPhone ?? ''} disabled />
                  </div>
                  <div>
                    <FieldLabel required>No. Identitas KTP/SIM</FieldLabel>
                    <input
                      className="apply-input"
                      value={formData.no_identitas}
                      onChange={(e) => setField('no_identitas', e.target.value)}
                      placeholder="Nomor KTP atau SIM"
                    />
                    <FieldError msg={fieldErrors.no_identitas} />
                  </div>
                  <div>
                    <FieldLabel required>Agama</FieldLabel>
                    <input
                      className="apply-input"
                      value={formData.agama}
                      onChange={(e) => setField('agama', e.target.value)}
                      placeholder="Agama yang dianut"
                    />
                    <FieldError msg={fieldErrors.agama} />
                  </div>
                  <div>
                    <FieldLabel required>Status Perkawinan</FieldLabel>
                    <select
                      className="apply-input"
                      value={formData.status_perkawinan}
                      onChange={(e) => setField('status_perkawinan', e.target.value)}
                    >
                      <option value="">-- Pilih --</option>
                      {STATUS_PERKAWINAN.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <FieldError msg={fieldErrors.status_perkawinan} />
                  </div>
                  <div>
                    <FieldLabel>Kewarganegaraan</FieldLabel>
                    <input
                      className="apply-input"
                      value={formData.kewarganegaraan}
                      onChange={(e) => setField('kewarganegaraan', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Foto Diri (opsional, maks. 500 KB)</FieldLabel>
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-brand-400 hover:bg-brand-50/30"
                  >
                    <Upload size={16} className="shrink-0 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      {photoFile ? photoFile.name : 'Klik untuk pilih foto (JPEG/PNG/WebP)'}
                    </span>
                    {photoFile && (
                      <button
                        type="button"
                        className="ml-auto text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setPhotoFile(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)} />
                  <FieldError msg={fieldErrors.photo} />
                </div>
              </Section>
            )}

            {/* ── STEP 2: Riwayat Pendidikan ─────────────────────── */}
            {step === 2 && (
              <>
                <Section title="Pendidikan Formal">
                  {fieldErrors.pendidikan_formal && (
                    <p className="text-xs text-red-500">{fieldErrors.pendidikan_formal}</p>
                  )}
                  <div className="space-y-3">
                    {formData.pendidikan_formal.map((row, idx) => (
                      <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        {formData.pendidikan_formal.length > 1 && (
                          <button type="button" onClick={() => removePendidikanFormal(idx)}
                            className="absolute right-3 top-3 rounded-lg p-1 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Tingkat</FieldLabel>
                            <input className="apply-input" value={row.tingkat}
                              onChange={(e) => updatePendidikanFormal(idx, 'tingkat', e.target.value)}
                              placeholder="SMA/SMK, D3, S1, S2..." />
                          </div>
                          <div>
                            <FieldLabel>Nama Sekolah/Universitas</FieldLabel>
                            <input className="apply-input" value={row.nama_sekolah}
                              onChange={(e) => updatePendidikanFormal(idx, 'nama_sekolah', e.target.value)}
                              placeholder="Nama institusi pendidikan" />
                          </div>
                          <div>
                            <FieldLabel>Jurusan</FieldLabel>
                            <input className="apply-input" value={row.jurusan}
                              onChange={(e) => updatePendidikanFormal(idx, 'jurusan', e.target.value)}
                              placeholder="Jurusan atau program studi" />
                          </div>
                          <div>
                            <FieldLabel>Tahun Lulus</FieldLabel>
                            <input className="apply-input" value={row.tahun_lulus}
                              onChange={(e) => updatePendidikanFormal(idx, 'tahun_lulus', e.target.value)}
                              placeholder="2020" />
                          </div>
                          <div>
                            <FieldLabel>Nilai Ijazah / IPK</FieldLabel>
                            <input className="apply-input" value={row.nilai}
                              onChange={(e) => updatePendidikanFormal(idx, 'nilai', e.target.value)}
                              placeholder="3.75 atau 8.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addPendidikanFormal}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    <Plus size={15} /> Tambah Pendidikan
                  </button>
                </Section>

                <div className="mx-6 border-t border-slate-100 sm:mx-8" />

                <Section title="Pendidikan Non Formal">
                  <p className="text-xs text-slate-400">Kursus, training, diklat, sertifikasi, dll. (opsional)</p>
                  {formData.pendidikan_non_formal.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input className="apply-input flex-1" value={item}
                        onChange={(e) => updatePendidikanNonFormal(idx, e.target.value)}
                        placeholder="Nama kursus/training/diklat" />
                      <button type="button" onClick={() => removePendidikanNonFormal(idx)}
                        className="rounded-lg p-1.5 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addPendidikanNonFormal}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    <Plus size={15} /> Tambah
                  </button>
                </Section>
              </>
            )}

            {/* ── STEP 3: Pengalaman ─────────────────────────────── */}
            {step === 3 && (
              <>
                <Section title="Pengalaman Kerja">
                  <p className="text-xs text-slate-400">Opsional. Tambahkan pengalaman kerja sebelumnya jika ada.</p>
                  {formData.pengalaman_kerja.map((row, idx) => (
                    <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <button type="button" onClick={() => removePengalamanKerja(idx)}
                        className="absolute right-3 top-3 rounded-lg p-1 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Nama Perusahaan</FieldLabel>
                          <input className="apply-input" value={row.nama_perusahaan}
                            onChange={(e) => updatePengalamanKerja(idx, 'nama_perusahaan', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>Jabatan</FieldLabel>
                          <input className="apply-input" value={row.jabatan}
                            onChange={(e) => updatePengalamanKerja(idx, 'jabatan', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>Periode Dari</FieldLabel>
                          <input type="month" className="apply-input" value={row.periode_dari}
                            onChange={(e) => updatePengalamanKerja(idx, 'periode_dari', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>Periode Hingga</FieldLabel>
                          <input type="month" className="apply-input" value={row.periode_hingga}
                            onChange={(e) => updatePengalamanKerja(idx, 'periode_hingga', e.target.value)}
                            placeholder="Kosongkan jika masih bekerja" />
                        </div>
                        <div>
                          <FieldLabel>Gaji Terakhir</FieldLabel>
                          <RupiahInput
                            value={row.gaji_terakhir}
                            onChange={(raw) => updatePengalamanKerja(idx, 'gaji_terakhir', raw)}
                            inputClassName="apply-input"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addPengalamanKerja}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    <Plus size={15} /> Tambah Pengalaman Kerja
                  </button>
                </Section>

                <div className="mx-6 border-t border-slate-100 sm:mx-8" />

                <Section title="Pengalaman Organisasi">
                  <p className="text-xs text-slate-400">Opsional.</p>
                  {formData.pengalaman_organisasi.map((row, idx) => (
                    <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <button type="button" onClick={() => removeOrganisasi(idx)}
                        className="absolute right-3 top-3 rounded-lg p-1 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Nama Organisasi</FieldLabel>
                          <input className="apply-input" value={row.nama_organisasi}
                            onChange={(e) => updateOrganisasi(idx, 'nama_organisasi', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>Periode</FieldLabel>
                          <input className="apply-input" value={row.periode}
                            onChange={(e) => updateOrganisasi(idx, 'periode', e.target.value)}
                            placeholder="2019 - 2021" />
                        </div>
                        <div>
                          <FieldLabel>Jabatan</FieldLabel>
                          <input className="apply-input" value={row.jabatan}
                            onChange={(e) => updateOrganisasi(idx, 'jabatan', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>Tugas/Deskripsi</FieldLabel>
                          <input className="apply-input" value={row.tugas}
                            onChange={(e) => updateOrganisasi(idx, 'tugas', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addOrganisasi}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    <Plus size={15} /> Tambah Organisasi
                  </button>
                </Section>
              </>
            )}

            {/* ── STEP 4: Kompetensi & Info ──────────────────────── */}
            {step === 4 && (
              <>
                <Section title="Penguasaan Bahasa">
                  {fieldErrors.penguasaan_bahasa && (
                    <p className="text-xs text-red-500">{fieldErrors.penguasaan_bahasa}</p>
                  )}
                  {formData.penguasaan_bahasa.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input className="apply-input flex-1" value={item}
                        onChange={(e) => updateBahasa(idx, e.target.value)}
                        placeholder="Contoh: Indonesia, Inggris, Mandarin..." />
                      {formData.penguasaan_bahasa.length > 1 && (
                        <button type="button" onClick={() => removeBahasa(idx)}
                          className="rounded-lg p-1.5 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBahasa}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    <Plus size={15} /> Tambah Bahasa
                  </button>
                </Section>

                <div className="mx-6 border-t border-slate-100 sm:mx-8" />

                <Section title="Soft Skill">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {SOFT_SKILL_LIST.map((skill) => {
                      const checked = formData.soft_skill.includes(skill);
                      return (
                        <label key={skill}
                          className={[
                            'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all',
                            checked
                              ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-200 hover:bg-white',
                          ].join(' ')}>
                          <div className={[
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            checked ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white',
                          ].join(' ')}>
                            {checked && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleSoftSkill(skill)} />
                          <span className="text-xs font-medium">{skill}</span>
                        </label>
                      );
                    })}
                  </div>
                </Section>

                <div className="mx-6 border-t border-slate-100 sm:mx-8" />

                <Section title="Informasi Tambahan">
                  <div>
                    <FieldLabel required>Dari mana Anda mendapat informasi lowongan ini?</FieldLabel>
                    <textarea className="apply-input resize-none" rows={2}
                      value={formData.sumber_info} onChange={(e) => setField('sumber_info', e.target.value)}
                      placeholder="Instagram @gaharusempanagroup, rekomendasi teman, dsb." />
                    <FieldError msg={fieldErrors.sumber_info} />
                  </div>
                  <div>
                    <FieldLabel required>Apa yang Anda ketahui tentang Gaharu Sempana Group?</FieldLabel>
                    <textarea className="apply-input resize-none" rows={3}
                      value={formData.tentang_gsg} onChange={(e) => setField('tentang_gsg', e.target.value)} />
                    <FieldError msg={fieldErrors.tentang_gsg} />
                  </div>
                  <div>
                    <FieldLabel required>Hal apa yang membuat Anda tertarik bergabung?</FieldLabel>
                    <textarea className="apply-input resize-none" rows={3}
                      value={formData.alasan_bergabung} onChange={(e) => setField('alasan_bergabung', e.target.value)} />
                    <FieldError msg={fieldErrors.alasan_bergabung} />
                  </div>
                  <div>
                    <FieldLabel required>Apa misi kontribusi Anda untuk perusahaan?</FieldLabel>
                    <textarea className="apply-input resize-none" rows={3}
                      value={formData.misi_kontribusi} onChange={(e) => setField('misi_kontribusi', e.target.value)} />
                    <FieldError msg={fieldErrors.misi_kontribusi} />
                  </div>
                  <div>
                    <FieldLabel required>Gaji/bulan yang diharapkan</FieldLabel>
                    <RupiahInput
                      value={formData.gaji_harapan}
                      onChange={(raw) => setField('gaji_harapan', raw)}
                      inputClassName="apply-input"
                    />
                    <FieldError msg={fieldErrors.gaji_harapan} />
                  </div>
                </Section>
              </>
            )}

            {/* ── STEP 5: Tanda Tangan ───────────────────────────── */}
            {step === 5 && (
              <Section title="Tanda Tangan &amp; Persetujuan">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Dibuat di (Kota)</FieldLabel>
                    <input className="apply-input" value={formData.kota_tanda_tangan}
                      onChange={(e) => setField('kota_tanda_tangan', e.target.value)}
                      placeholder="Makassar" />
                    <FieldError msg={fieldErrors.kota_tanda_tangan} />
                  </div>
                  <div>
                    <FieldLabel>Tanggal</FieldLabel>
                    <input type="date" className="apply-input" value={today} disabled />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Tanda Tangan</FieldLabel>
                  <div className="mb-3 flex gap-2">
                    {(['gambar', 'upload'] as const).map((tab) => (
                      <button key={tab} type="button" onClick={() => setSignatureTab(tab)}
                        className={[
                          'rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                          signatureTab === tab
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                            : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white',
                        ].join(' ')}>
                        {tab === 'gambar' ? 'Gambar di layar' : 'Upload foto tanda tangan'}
                      </button>
                    ))}
                  </div>
                  {signatureTab === 'gambar' ? (
                    <SignatureCanvas onCapture={setSignatureDataUrl} />
                  ) : (
                    <div>
                      <div onClick={() => signatureInputRef.current?.click()}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
                        <Upload size={16} className="shrink-0 text-slate-400" />
                        <span className="text-sm text-slate-500">
                          {signatureFile ? signatureFile.name : 'Klik untuk pilih foto tanda tangan (maks. 500 KB)'}
                        </span>
                        {signatureFile && (
                          <button type="button" className="ml-auto text-xs font-medium text-red-400 transition-colors hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); setSignatureFile(null); if (signatureInputRef.current) signatureInputRef.current.value = ''; }}>
                            Hapus
                          </button>
                        )}
                      </div>
                      <input ref={signatureInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                        onChange={(e) => handleSignatureFileChange(e.target.files?.[0] ?? null)} />
                    </div>
                  )}
                  <FieldError msg={fieldErrors.signature} />
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <p className="text-xs leading-relaxed text-slate-400">
                  Dengan mengklik tombol di bawah, Anda menyatakan bahwa semua data yang diisi adalah benar dan dapat dipertanggungjawabkan.
                </p>
              </Section>
            )}

            {/* ── Navigasi ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
              {step > 1 ? (
                <button type="button" onClick={goBack}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  <ChevronLeft size={16} /> Kembali
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{step} / {STEPS.length}</span>
                {step < 5 ? (
                  <button type="button" onClick={goNext}
                    className="apply-btn flex items-center gap-1.5 px-7">
                    Lanjut <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="submit" className="apply-btn px-7" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Mengirim...
                      </span>
                    ) : (
                      'Kirim Form Pelamar'
                    )}
                  </button>
                )}
              </div>
            </div>

          </form>
        </div>

      </div>
    </BG>
  );
}
