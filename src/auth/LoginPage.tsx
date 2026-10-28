import { BrandLogo } from '@/shared/ui/BrandLogo';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Briefcase, Eye, EyeOff, FileText, Lock, Mail, Moon, Sun, Users } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from '@/shared/ThemeContext';

const FEATURES = [
  { icon: FileText, title: 'Pengajuan MRF', description: 'Kebutuhan tim dan persetujuan yang terarah.' },
  { icon: Briefcase, title: 'Rekrutmen', description: 'Dari lowongan hingga offering letter.' },
  { icon: Users, title: 'Database karyawan', description: 'Informasi dan dokumen dalam satu tempat.' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Email atau password salah.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="portfolio-surface relative isolate flex min-h-[100dvh] flex-col overflow-hidden text-ink">
      <div className="ambient-strands" aria-hidden="true" />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <BrandLogo alt="Logo Gaharu Sempana Group" className="h-10 w-10 object-contain" />
          <div><h1 className="brand-wordmark">SIMANSA<span className="text-accent">.</span></h1><p className="text-[11px] text-caption">Gaharu Sempana Group</p></div>
        </div>
        <button onClick={toggle} className="icon-button" aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>
      <main className="flex flex-1 items-center">
        <div className="login-layout page-enter">
          <section className="hidden lg:block">
            <span className="section-pill"><Users size={13} /> Human Resource Management</span>
            <h2 className="login-heading mt-7">Ruang untuk<br /><span className="gradient-text">tim bertumbuh.</span></h2>
            <p className="mt-6 max-w-md text-base leading-7 text-caption">Kelola rekrutmen, penugasan, dan database karyawan Gaharu Sempana Group dalam satu ekosistem yang terstruktur.</p>
            <div className="mt-9 grid max-w-md gap-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="login-feature">
                  <span className="login-feature-icon"><Icon size={19} strokeWidth={1.6} /></span>
                  <div><h3 className="text-sm font-semibold text-body">{title}</h3><p className="mt-1 text-xs text-caption">{description}</p></div>
                </div>
              ))}
            </div>
          </section>
          <section className="card glow-panel mx-auto w-full max-w-md !rounded-[32px] !p-7 sm:!p-10" aria-labelledby="login-title">
            <span className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft text-accent"><Lock size={21} strokeWidth={1.5} /></span>
            <h2 id="login-title" className="text-3xl font-bold tracking-tight">Selamat Datang</h2>
            <p className="mt-3 text-sm leading-6 text-caption">Silakan masukkan akun Anda yang terdaftar untuk melanjutkan.</p>
            {error && <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
            <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-5" aria-busy={busy}>
              <div>
                <label htmlFor="login-email" className="field-label">Email</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-caption" />
                  <input id="login-email" type="email" autoComplete="username" required disabled={busy} className="field-input !pl-11" placeholder="nama@gaharusempana.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="field-label">Password</label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-caption" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={busy} className="field-input !pl-11 !pr-12" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-caption hover:text-ink" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-primary !mt-7 w-full !py-3.5">
                {busy ? 'Memproses...' : <>Masuk ke Sistem <ArrowRight size={17} /></>}
              </button>
            </form>
            <p className="mt-7 flex items-center justify-center gap-2 border-t border-line pt-6 text-xs text-caption"><Lock size={12} /> Akses khusus pengguna terdaftar</p>
          </section>
        </div>
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 px-5 py-6 text-[11px] text-caption sm:px-8">
        <span>&copy; 2026 Gaharu Sempana Group. All rights reserved.</span><span>Sistem Manajemen Sumber Daya Manusia</span>
      </footer>
    </div>
  );
}
