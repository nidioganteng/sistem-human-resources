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

  // Teks
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

  // Berkas
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memuat...</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="apply-card max-w-md text-center">
          <p className="text-slate-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="apply-card max-w-md space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
            <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-lg font-bold text-slate-800">Data Sudah Diterima</h1>
          <p className="text-sm text-slate-600">
            Data Anda sudah diterima. Silakan hubungi HR jika ada perubahan.
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
          <h1 className="font-heading text-lg font-bold text-slate-800">Data Berhasil Dikirim!</h1>
          <p className="text-sm text-slate-600">
            HR akan memeriksa dan menghubungi Anda jika ada yang kurang.
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
          <h1 className="font-heading mt-1 text-2xl font-bold text-slate-900">Formulir Onboarding</h1>
          {info && (
            <p className="mt-1 text-sm text-slate-500">
              {info.fullName} &ndash; {info.position}
              {info.division ? ` / ${info.division}` : ''}
            </p>
          )}
        </div>

        <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
          <div className="apply-card space-y-4">
            <h2 className="font-heading text-base font-bold text-slate-800">Data Pribadi</h2>

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
              <label className="apply-label">Nomor BPJS <span className="text-slate-400 text-xs">(wajib)</span></label>
              <input
                className="apply-input"
                value={bpjsNumber}
                onChange={(e) => setBpjsNumber(e.target.value)}
                placeholder="Nomor kartu BPJS"
              />
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

          <div className="apply-card space-y-4">
            <h2 className="font-heading text-base font-bold text-slate-800">Unggah Dokumen</h2>
            <p className="text-xs text-slate-500">Format: PDF, JPG, atau PNG. Maks. {MAX_MB} MB per berkas.</p>

            {DOC_FIELDS.map(({ key, label, required }) => (
              <div key={key}>
                <label className="apply-label">
                  {label}
                  {required && <span className="text-red-500"> *</span>}
                  {uploadedDocTypes.has(key) && (
                    <span className="ml-2 text-xs text-emerald-600">(sudah ada)</span>
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

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            className="apply-btn w-full"
            disabled={submitting}
          >
            {submitting ? 'Mengirim...' : 'Kirim Data'}
          </button>

          <p className="text-center text-xs text-slate-400">
            Dengan mengirim formulir ini, Anda menyatakan bahwa semua informasi yang diberikan adalah benar.
          </p>
        </form>
      </div>
    </div>
  );
}
