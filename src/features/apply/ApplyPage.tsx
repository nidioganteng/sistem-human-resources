import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

interface VacancyInfo {
  position: string;
  division: string;
  status: 'open' | 'closed';
}

type Step = 'loading' | 'closed' | 'form' | 'success' | 'error';

const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export default function ApplyPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [vacancy, setVacancy] = useState<VacancyInfo | null>(null);
  const [loadError, setLoadError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const cvRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/apply/${token}`)
      .then((r) => r.json())
      .then((data: VacancyInfo & { message?: string }) => {
        if (data.message) {
          setLoadError(data.message);
          setStep('error');
          return;
        }
        setVacancy(data);
        setStep(data.status === 'open' ? 'form' : 'closed');
      })
      .catch(() => {
        setLoadError('Gagal memuat informasi lowongan.');
        setStep('error');
      });
  }, [token]);

  const validateFile = (file: File | null, label: string, required: boolean): string => {
    if (!file) return required ? `${label} wajib diunggah.` : '';
    if (file.type !== 'application/pdf') return `${label} harus berformat PDF.`;
    if (file.size > MAX_BYTES) return `${label} melebihi batas ${MAX_MB} MB.`;
    return '';
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Alamat email tidak valid.';
    if (!phone.trim()) errs.phone = 'Nomor HP wajib diisi.';
    const cvErr = validateFile(cv, 'CV', true);
    if (cvErr) errs.cv = cvErr;
    const portErr = validateFile(portfolio, 'Portofolio', false);
    if (portErr) errs.portfolio = portErr;
    if (!consent) errs.consent = 'Persetujuan wajib diberikan.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');

    const fd = new FormData();
    fd.append('full_name', fullName.trim());
    fd.append('email', email.trim());
    fd.append('phone', phone.trim());
    fd.append('consent', '1');
    fd.append('cv', cv as File);
    if (portfolio) fd.append('portfolio', portfolio);

    try {
      const res = await fetch(`/api/apply/${token ?? ''}`, { method: 'POST', body: fd });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok) {
        setSubmitError(data.message ?? 'Terjadi kesalahan pada server.');
        return;
      }
      setStep('success');
    } catch {
      setSubmitError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memuat...</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="apply-card max-w-md text-center">
          <p className="text-slate-600">{loadError || 'Terjadi kesalahan.'}</p>
        </div>
      </div>
    );
  }

  if (step === 'closed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="apply-card max-w-md space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-heading text-lg font-bold text-slate-800">Lowongan Sudah Ditutup</h1>
          <p className="text-sm text-slate-600">
            Lowongan untuk posisi <strong>{vacancy?.position}</strong> di divisi{' '}
            <strong>{vacancy?.division}</strong> sudah tidak menerima lamaran.
          </p>
          <p className="text-xs text-slate-400">
            Ikuti akun Instagram{' '}
            <a
              href="https://instagram.com/gaharusempanagroup"
              className="text-sky-700 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              @gaharusempanagroup
            </a>{' '}
            untuk info lowongan berikutnya.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="apply-card max-w-md space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-lg font-bold text-slate-800">Lamaran Terkirim!</h1>
          <p className="text-sm text-slate-600">
            Terima kasih telah melamar posisi <strong>{vacancy?.position}</strong>.
            Tim HR kami akan meninjau lamaran Anda dan mengirimkan email jika Anda lolos screening.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <img
            src="/logo-gsg.png"
            alt="Logo Gaharu Sempana Group"
            className="mx-auto mb-3 h-12 w-12 object-contain"
          />
          <div className="font-heading text-xs font-semibold uppercase tracking-widest text-sky-700">
            Gaharu Sempana Group
          </div>
          <h1 className="font-heading mt-1 text-2xl font-bold text-slate-900">Formulir Lamaran</h1>
          <p className="mt-1 text-sm text-slate-500">
            {vacancy?.position} &ndash; Divisi {vacancy?.division}
          </p>
        </div>

        <form className="apply-card space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="apply-label">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              className="apply-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama sesuai KTP"
            />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
          </div>

          <div>
            <label className="apply-label">
              Alamat Email <span className="text-red-500">*</span>
            </label>
            <input
              className="apply-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="apply-label">
              Nomor HP <span className="text-red-500">*</span>
            </label>
            <input
              className="apply-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xx-xxxx-xxxx"
            />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="apply-label">
              CV / Daftar Riwayat Hidup (PDF, maks. {MAX_MB} MB) <span className="text-red-500">*</span>
            </label>
            <input
              ref={cvRef}
              type="file"
              accept="application/pdf,.pdf"
              className="apply-input cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
            />
            {fieldErrors.cv && <p className="mt-1 text-xs text-red-600">{fieldErrors.cv}</p>}
          </div>

          <div>
            <label className="apply-label">
              Portofolio (PDF, maks. {MAX_MB} MB, opsional)
            </label>
            <input
              ref={portRef}
              type="file"
              accept="application/pdf,.pdf"
              className="apply-input cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-600"
              onChange={(e) => setPortfolio(e.target.files?.[0] ?? null)}
            />
            {fieldErrors.portfolio && <p className="mt-1 text-xs text-red-600">{fieldErrors.portfolio}</p>}
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span className="text-xs text-slate-600">
              Saya menyetujui bahwa data dan dokumen yang saya kirimkan akan disimpan oleh Gaharu Sempana Group
              selama proses rekrutmen berlangsung, hingga maksimal 2 tahun, sesuai kebijakan penyimpanan data
              perusahaan. <span className="text-red-500">*</span>
            </span>
          </label>
          {fieldErrors.consent && <p className="-mt-2 text-xs text-red-600">{fieldErrors.consent}</p>}

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <button type="submit" className="apply-btn w-full" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Lamaran'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Dengan mengirim formulir ini, Anda menyatakan bahwa semua informasi yang diberikan adalah benar.
        </p>
      </div>
    </div>
  );
}
