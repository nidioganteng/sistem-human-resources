import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Upload, FileText, ChevronRight, ChevronLeft } from 'lucide-react';

interface VacancyInfo {
  position: string;
  division: string;
  status: 'open' | 'closed';
}

type Step = 'loading' | 'closed' | 'form' | 'success' | 'error';
type FormStep = 1 | 2 | 3;

const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const STEPS: { label: string; sub: string }[] = [
  { label: 'Identitas', sub: 'Data diri' },
  { label: 'Berkas', sub: 'Dokumen lamaran' },
  { label: 'Konfirmasi', sub: 'Kirim lamaran' },
];

// Didefinisikan di LUAR komponen agar tidak di-remount setiap render
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
        <div className="animate-float-medium absolute bottom-24 right-12 h-16 w-16 rounded-2xl border border-white/15 bg-white/8" style={{ animationDelay: '0.5s' }} />
        <div className="animate-float-slow absolute top-1/2 left-8 h-6 w-6 rotate-12 border border-white/20 bg-white/10" style={{ animationDelay: '3.5s' }} />
        <div className="animate-float-medium absolute top-3/4 right-8 h-10 w-10 rounded-full border border-white/15 bg-white/8" style={{ animationDelay: '2.5s' }} />

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

function StepIndicator({ current }: { current: FormStep }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const idx = (i + 1) as FormStep;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all',
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'border-2 border-slate-200 bg-white text-slate-400',
                ].join(' ')}
              >
                {done ? <CheckCircle2 size={18} /> : idx}
              </div>
              <div className="text-center">
                <p className={['text-xs font-semibold', active ? 'text-brand-600' : done ? 'text-slate-600' : 'text-slate-400'].join(' ')}>
                  {s.label}
                </p>
                <p className="text-[10px] text-slate-400">{s.sub}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={['mx-4 mb-5 h-0.5 w-16 transition-colors', done ? 'bg-brand-500' : 'bg-slate-200'].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileUploadBox({
  label,
  required,
  file,
  onChange,
  error,
  inputRef,
  hint,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  hint?: string;
}) {
  return (
    <div>
      <label className="apply-label">
        {label} {required && <span className="text-red-500 normal-case font-bold">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className={[
          'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all',
          file
            ? 'border-brand-400 bg-brand-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <FileText size={20} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-700">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB &middot; PDF</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="mt-1 text-xs font-medium text-red-500 hover:text-red-700"
            >
              Hapus file
            </button>
          </>
        ) : (
          <>
            <div className={['flex h-10 w-10 items-center justify-center rounded-full transition-colors', error ? 'bg-red-100' : 'bg-slate-100 group-hover:bg-brand-100'].join(' ')}>
              <Upload size={20} className={error ? 'text-red-400' : 'text-slate-400 group-hover:text-brand-500'} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 group-hover:text-brand-600">Klik untuk pilih file</p>
              <p className="text-xs text-slate-400">PDF, maks. {MAX_MB} MB</p>
            </div>
            {hint && <p className="text-xs text-slate-400 italic">{hint}</p>}
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ApplyPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [vacancy, setVacancy] = useState<VacancyInfo | null>(null);
  const [loadError, setLoadError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
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
        if (data.message) { setLoadError(data.message); setStep('error'); return; }
        setVacancy(data);
        setStep(data.status === 'open' ? 'form' : 'closed');
      })
      .catch(() => { setLoadError('Gagal memuat informasi lowongan.'); setStep('error'); });
  }, [token]);

  const validateFile = (file: File | null, label: string, required: boolean): string => {
    if (!file) return required ? `${label} wajib diunggah.` : '';
    if (file.type !== 'application/pdf') return `${label} harus berformat PDF.`;
    if (file.size > MAX_BYTES) return `${label} melebihi batas ${MAX_MB} MB.`;
    return '';
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Alamat email tidak valid.';
    if (!phone.trim()) errs.phone = 'Nomor HP wajib diisi.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    const cvErr = validateFile(cv, 'CV', true);
    if (cvErr) errs.cv = cvErr;
    const portErr = validateFile(portfolio, 'Portofolio', false);
    if (portErr) errs.portfolio = portErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (formStep === 1 && !validateStep1()) return;
    if (formStep === 2 && !validateStep2()) return;
    setFormStep((s) => (s + 1) as FormStep);
    setFieldErrors({});
  };

  const handleBack = () => {
    setFormStep((s) => (s - 1) as FormStep);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setFieldErrors({ consent: 'Persetujuan wajib diberikan.' }); return; }
    setSubmitting(true);
    setSubmitError('');

    const fd = new FormData();
    fd.append('full_name', fullName.trim());
    fd.append('email', email.trim());
    fd.append('phone', phone.trim());
    fd.append('consent', '1');
    fd.append('cv', cv as File);
    if (portfolio) fd.append('portfolio', portfolio);
    if (message.trim()) fd.append('message', message.trim());

    try {
      const res = await fetch(`/api/apply/${token ?? ''}`, { method: 'POST', body: fd });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok) { setSubmitError(data.message ?? 'Terjadi kesalahan pada server.'); return; }
      setStep('success');
    } catch {
      setSubmitError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            <p className="text-sm text-white/70">Memuat informasi lowongan...</p>
          </div>
        </div>
      </BG>
    );
  }

  if (step === 'error') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="apply-card max-w-md w-full p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-800">Terjadi Kesalahan</p>
            <p className="text-sm text-slate-500">{loadError}</p>
          </div>
        </div>
      </BG>
    );
  }

  if (step === 'closed') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="apply-card max-w-md w-full p-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Lowongan Sudah Ditutup</h1>
              <p className="mt-2 text-sm text-slate-500">
                Lowongan <strong className="text-slate-700">{vacancy?.position}</strong> di divisi{' '}
                <strong className="text-slate-700">{vacancy?.division}</strong> sudah tidak menerima lamaran.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Ikuti{' '}
              <a href="https://instagram.com/gaharusempanagroup" className="font-medium text-brand-600 hover:underline" target="_blank" rel="noreferrer">
                @gaharusempanagroup
              </a>{' '}
              untuk info lowongan berikutnya.
            </p>
          </div>
        </div>
      </BG>
    );
  }

  if (step === 'success') {
    return (
      <BG>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="apply-card max-w-md w-full p-10 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Lamaran Terkirim!</h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Terima kasih, <strong className="text-slate-700">{fullName}</strong>! Lamaran Anda untuk posisi{' '}
                <strong className="text-slate-700">{vacancy?.position}</strong> sedang kami tinjau.
                Tim HR akan mengirim email jika Anda lolos screening awal.
              </p>
            </div>
          </div>
        </div>
      </BG>
    );
  }

  return (
    <BG>
      <div className="flex min-h-screen flex-col">
        {/* Top nav bar */}
        <header className="flex items-center gap-3 px-6 py-4">
          <img src="/logo-gsg.png" alt="Logo Gaharu Sempana Group" className="h-9 w-auto object-contain drop-shadow" />
          <div className="h-5 w-px bg-white/20" />
          <span className="text-sm font-semibold text-white/80">Gaharu Sempana Group</span>
        </header>

        {/* Content */}
        <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-4">
          <div className="w-full max-w-xl space-y-4">
            <div className="px-1">
              <h1 className="text-xl font-bold text-white">Formulir Lamaran</h1>
              <p className="text-sm text-white/60">{vacancy?.position} &middot; Divisi {vacancy?.division}</p>
            </div>

            <div className="apply-card overflow-hidden">
              <div className="border-b border-slate-100 px-8 pt-7 pb-6">
                <StepIndicator current={formStep} />
              </div>

              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="px-8 py-7 space-y-5">

                  {formStep === 1 && (
                    <>
                      <div>
                        <p className="text-base font-bold text-slate-800">Data Diri</p>
                        <p className="text-xs text-slate-400 mt-0.5">Isi dengan data yang sesuai dokumen resmi.</p>
                      </div>
                      <div>
                        <label className="apply-label">Nama Lengkap <span className="text-red-500 normal-case font-bold">*</span></label>
                        <input
                          className="apply-input"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nama sesuai KTP"
                        />
                        {fieldErrors.fullName && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.fullName}</p>}
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label className="apply-label">Alamat Email <span className="text-red-500 normal-case font-bold">*</span></label>
                          <input
                            className="apply-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@contoh.com"
                          />
                          {fieldErrors.email && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>}
                        </div>
                        <div>
                          <label className="apply-label">Nomor HP <span className="text-red-500 normal-case font-bold">*</span></label>
                          <input
                            className="apply-input"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="08xx-xxxx-xxxx"
                          />
                          {fieldErrors.phone && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.phone}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {formStep === 2 && (
                    <>
                      <div>
                        <p className="text-base font-bold text-slate-800">Berkas Lamaran</p>
                        <p className="text-xs text-slate-400 mt-0.5">Unggah dalam format PDF, maksimal {MAX_MB} MB per file.</p>
                      </div>
                      <FileUploadBox label="CV / Daftar Riwayat Hidup" required file={cv} onChange={setCv} error={fieldErrors.cv} inputRef={cvRef} />
                      <FileUploadBox label="Portofolio" file={portfolio} onChange={setPortfolio} error={fieldErrors.portfolio} inputRef={portRef} hint="Opsional" />
                      <div>
                        <label className="apply-label">Pesan untuk HR</label>
                        <textarea
                          className="apply-input resize-none"
                          rows={3}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Link portofolio online, keterangan tambahan, atau pesan untuk HR... (opsional)"
                          maxLength={1000}
                        />
                        <p className="mt-1 text-right text-xs text-slate-400">{message.length}/1000</p>
                      </div>
                    </>
                  )}

                  {formStep === 3 && (
                    <>
                      <div>
                        <p className="text-base font-bold text-slate-800">Konfirmasi Lamaran</p>
                        <p className="text-xs text-slate-400 mt-0.5">Periksa kembali data Anda sebelum mengirim.</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ringkasan Data</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {[
                            { k: 'Nama Lengkap', v: fullName },
                            { k: 'Email', v: email },
                            { k: 'Nomor HP', v: phone },
                            { k: 'CV', v: cv?.name ?? '-' },
                            { k: 'Portofolio', v: portfolio?.name ?? 'Tidak dilampirkan' },
                          ].map(({ k, v }) => (
                            <div key={k} className="flex items-start justify-between gap-4 px-5 py-2.5">
                              <span className="text-xs text-slate-400 shrink-0">{k}</span>
                              <span className="text-xs font-medium text-slate-700 text-right break-all">{v}</span>
                            </div>
                          ))}
                          {message && (
                            <div className="px-5 py-2.5">
                              <p className="text-xs text-slate-400 mb-1">Pesan</p>
                              <p className="text-xs text-slate-700">{message}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          <div className={[
                            'h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center',
                            consent ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white group-hover:border-brand-400',
                          ].join(' ')}>
                            {consent && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-xs leading-relaxed text-slate-600">
                          Saya menyetujui bahwa data dan dokumen yang saya kirimkan akan disimpan oleh{' '}
                          <strong className="text-slate-800">Gaharu Sempana Group</strong> selama proses rekrutmen
                          berlangsung, hingga maksimal 2 tahun, sesuai kebijakan penyimpanan data perusahaan.{' '}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      {fieldErrors.consent && <p className="-mt-2 text-xs text-red-600">{fieldErrors.consent}</p>}

                      {submitError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {submitError}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5">
                  {formStep > 1 ? (
                    <button type="button" className="apply-btn-ghost" onClick={handleBack} disabled={submitting}>
                      <ChevronLeft size={16} /> Kembali
                    </button>
                  ) : (
                    <div />
                  )}
                  {formStep < 3 ? (
                    <button type="button" className="apply-btn" onClick={handleNext}>
                      Lanjut <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="submit" className="apply-btn" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Mengirim...
                        </>
                      ) : (
                        <>Kirim Lamaran <ChevronRight size={16} /></>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <p className="text-center text-xs text-white/40 pb-4">
              Dengan mengirim formulir ini, Anda menyatakan bahwa semua informasi yang diberikan adalah benar.
            </p>
          </div>
        </div>
      </div>
    </BG>
  );
}
