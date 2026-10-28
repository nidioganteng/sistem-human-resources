import { BrandLogo } from '@/shared/ui/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getOnboardingPublic,
  submitOnboarding,
  uploadOnboardingDocument,
} from '@/features/karyawan/karyawanService';

type Step = 'loading' | 'error' | 'done' | 'form' | 'success';

const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const DOC_FIELDS: Array<{ key: string; label: string; required: boolean }> = [
  { key: 'ktp', label: 'KTP', required: true },
  { key: 'bpjs', label: 'BPJS', required: false },
  { key: 'ijazah', label: 'Ijazah', required: false },
  { key: 'foto', label: 'Pasfoto', required: false },
  { key: 'npwp', label: 'NPWP', required: false },
  { key: 'lainnya', label: 'Dokumen Lainnya', required: false },
];

function PageBackground() {
  return <div className="portfolio-surface pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />;
}

export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>('loading');
  const [loadError, setLoadError] = useState('');
  const [info, setInfo] = useState<{
    fullName: string;
    position: string;
    division: string | null;
    personalData: Record<string, string> | null;
    documents: { docType: string }[];
  } | null>(null);

  const [nik, setNik] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [address, setAddress] = useState('');
  const [religion, setReligion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [npwpNumber, setNpwpNumber] = useState('');
  const [bpjsNumber, setBpjsNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) return;

    getOnboardingPublic(token)
      .then((data) => {
        setInfo(data);

        if (data.personalData) {
          const pd = data.personalData;
          if (pd['birth_date']) setBirthDate(pd['birth_date']);
          if (pd['birth_place']) setBirthPlace(pd['birth_place']);
          if (pd['address']) setAddress(pd['address']);
          if (pd['religion']) setReligion(pd['religion']);
          if (pd['marital_status']) setMaritalStatus(pd['marital_status']);
          if (pd['npwp_number']) setNpwpNumber(pd['npwp_number']);
          if (pd['bpjs_number']) setBpjsNumber(pd['bpjs_number']);
          if (pd['emergency_contact']) setEmergencyContact(pd['emergency_contact']);
        }

        if (data.status !== 'onboarding') {
          setStep('done');
          return;
        }
        setStep('form');
      })
      .catch(() => {
        setLoadError('Tautan tidak valid atau sudah kedaluwarsa. Hubungi HR untuk mendapatkan tautan baru.');
        setStep('error');
      });
  }, [token]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nik.trim()) errs['nik'] = 'NIK wajib diisi.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs['email'] = 'Alamat email tidak valid.';
    if (!phone.trim()) errs['phone'] = 'Nomor HP wajib diisi.';
    if (!birthDate) errs['birth_date'] = 'Tanggal lahir wajib diisi.';
    if (!birthPlace.trim()) errs['birth_place'] = 'Tempat lahir wajib diisi.';
    if (!address.trim()) errs['address'] = 'Alamat wajib diisi.';

    const ktpFile = files['ktp'];
    if (!ktpFile) {
      errs['ktp'] = 'KTP wajib diunggah.';
    } else {
      if (ktpFile.size > MAX_BYTES) errs['ktp'] = `KTP melebihi batas ${MAX_MB} MB.`;
    }

    Object.entries(files).forEach(([key, file]) => {
      if (!file || key === 'ktp') return;
      if (file.size > MAX_BYTES) errs[key] = `${key.toUpperCase()} melebihi batas ${MAX_MB} MB.`;
    });

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate() || !token) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      await submitOnboarding(token, {
        nik: nik.trim(),
        email: email.trim(),
        phone: phone.trim(),
        personalData: {
          birth_date: birthDate,
          birth_place: birthPlace.trim(),
          address: address.trim(),
          religion: religion.trim(),
          marital_status: maritalStatus,
          npwp_number: npwpNumber.trim(),
          bpjs_number: bpjsNumber.trim(),
          emergency_contact: emergencyContact.trim(),
        },
      });

      for (const { key } of DOC_FIELDS) {
        const file = files[key];
        if (file) {
          await uploadOnboardingDocument(token, key, file);
        }
      }

      setStep('success');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadedDocTypes = new Set(info?.documents.map((d) => d.docType) ?? []);

  if (step === 'loading') {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center">
        <PageBackground />
        <p className="relative text-sm text-caption">Memuat...</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center p-4">
        <PageBackground />
        <div className="apply-card relative max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-body">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center p-4">
        <PageBackground />
        <div className="apply-card relative max-w-md space-y-3 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
            <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-lg font-bold text-ink">Data Sudah Diterima</h1>
          <p className="text-sm text-body">
            Data Anda sudah diterima. Silakan hubungi HR jika ada perubahan.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center p-4">
        <PageBackground />
        <div className="apply-card relative max-w-md space-y-3 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-xl font-bold text-ink">Data Berhasil Dikirim!</h1>
          <p className="text-sm text-caption">
            HR akan memeriksa dan menghubungi Anda jika ada yang kurang.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page relative isolate min-h-[100dvh] px-4 py-10">
      <PageBackground />

      <div className="relative mx-auto max-w-lg">
        <div className="apply-card overflow-hidden">
          {/* Header bergradien */}
          <div className="relative public-banner px-8 py-8">
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="ob-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ob-dots)" />
              </svg>
            </div>
            <div className="relative flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 p-1 shadow-lg backdrop-blur-sm">
                <BrandLogo onDark
                  alt="Logo Gaharu Sempana Group"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                  Gaharu Sempana Group
                </p>
                <h1 className="font-heading mt-1 text-xl font-bold text-white">
                  Formulir Onboarding
                </h1>
                {info && (
                  <p className="mt-1 text-sm text-slate-300">
                    {info.fullName}
                    {info.position ? ` - ${info.position}` : ''}
                    {info.division ? ` / ${info.division}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)}>
            {/* Seksi Data Pribadi */}
            <div className="px-6 pb-2 pt-6 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100">
                  <svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="font-heading text-base font-bold text-ink">Data Pribadi</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="apply-label">NIK <span className="text-red-500">*</span></label>
                  <input
                    className="apply-input"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="16 digit NIK sesuai KTP"
                    inputMode="numeric"
                  />
                  {fieldErrors['nik'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['nik']}</p>}
                </div>

                <div>
                  <label className="apply-label">Email <span className="text-red-500">*</span></label>
                  <input
                    className="apply-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                  />
                  {fieldErrors['email'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['email']}</p>}
                </div>

                <div>
                  <label className="apply-label">Nomor HP <span className="text-red-500">*</span></label>
                  <input
                    className="apply-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xx-xxxx-xxxx"
                  />
                  {fieldErrors['phone'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['phone']}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="apply-label">Tanggal Lahir <span className="text-red-500">*</span></label>
                    <input
                      className="apply-input"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                    {fieldErrors['birth_date'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['birth_date']}</p>}
                  </div>
                  <div>
                    <label className="apply-label">Tempat Lahir <span className="text-red-500">*</span></label>
                    <input
                      className="apply-input"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="Kota"
                    />
                    {fieldErrors['birth_place'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['birth_place']}</p>}
                  </div>
                </div>

                <div>
                  <label className="apply-label">Alamat <span className="text-red-500">*</span></label>
                  <textarea
                    className="apply-input resize-none"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat lengkap sesuai KTP"
                  />
                  {fieldErrors['address'] && <p className="mt-1 text-xs text-red-600">{fieldErrors['address']}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="apply-label">Agama</label>
                    <input
                      className="apply-input"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      placeholder="mis. Islam"
                    />
                  </div>
                  <div>
                    <label className="apply-label">Status Pernikahan</label>
                    <select
                      className="apply-input"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                    >
                      <option value="">-- Pilih --</option>
                      <option value="Belum Menikah">Belum Menikah</option>
                      <option value="Menikah">Menikah</option>
                      <option value="Cerai">Cerai</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="apply-label">Nomor NPWP</label>
                    <input
                      className="apply-input"
                      value={npwpNumber}
                      onChange={(e) => setNpwpNumber(e.target.value)}
                      placeholder="xx.xxx.xxx.x-xxx.xxx"
                    />
                  </div>
                  <div>
                    <label className="apply-label">Nomor BPJS</label>
                    <input
                      className="apply-input"
                      value={bpjsNumber}
                      onChange={(e) => setBpjsNumber(e.target.value)}
                      placeholder="Nomor kartu BPJS"
                    />
                  </div>
                </div>

                <div>
                  <label className="apply-label">Kontak Darurat</label>
                  <input
                    className="apply-input"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Nama - Hubungan - Nomor HP"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 my-6 border-t border-line sm:mx-8" />

            {/* Seksi Dokumen */}
            <div className="px-6 pb-6 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100">
                  <svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-ink">Unggah Dokumen</h2>
                  <p className="text-xs text-caption">Format: PDF, JPG, atau PNG. Maks. {MAX_MB} MB per berkas.</p>
                </div>
              </div>

              <div className="space-y-4">
                {DOC_FIELDS.map(({ key, label, required }) => (
                  <div key={key}>
                    <label className="apply-label">
                      {label}
                      {required && <span className="text-red-500"> *</span>}
                      {uploadedDocTypes.has(key) && (
                        <span className="ml-2 normal-case text-emerald-600">(sudah ada)</span>
                      )}
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                      className="apply-input cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700"
                      ref={(el) => { fileRefs.current[key] = el; }}
                      onChange={(e) => setFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] ?? null }))}
                    />
                    {fieldErrors[key] && <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider + footer */}
            <div className="mx-6 border-t border-line sm:mx-8" />

            <div className="px-6 py-6 sm:px-8">
              {submitError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                className="apply-btn w-full py-3.5 text-base"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengirim...
                  </>
                ) : (
                  'Kirim Data'
                )}
              </button>

              <p className="mt-4 text-center text-xs text-caption">
                Dengan mengirim formulir ini, Anda menyatakan bahwa semua informasi yang diberikan adalah benar.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
