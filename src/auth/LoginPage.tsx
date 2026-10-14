import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';

const BG_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email atau password salah.');
    } finally {
      setBusy(false);
    }
  };

  const inputBase =
    'w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3.5 text-sm text-slate-100 ' +
    'focus:outline-none focus:border-[#158ed4] focus:ring-1 focus:ring-[#158ed4] transition-all ' +
    'shadow-inner placeholder:text-slate-600';

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-900 font-sans text-slate-100 md:flex-row">
      {/* Orbs */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[min(500px,60vw)] w-[min(500px,60vw)] animate-pulse rounded-full bg-[#158ed4]/20 blur-[120px]" />
      <div
        className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[min(600px,70vw)] w-[min(600px,70vw)] animate-pulse rounded-full bg-blue-600/20 blur-[150px]"
        style={{ animationDelay: '2s' }}
      />

      {/* ── Kiri: Branding ── */}
      <div className="relative z-10 hidden flex-col justify-between border-r border-white/10 p-12 shadow-[20px_0_40px_rgba(0,0,0,0.3)] md:flex md:w-1/2 lg:w-[55%] lg:p-20">
        <div className="absolute inset-0 z-0">
          <img
            src={BG_IMAGE}
            alt="Background"
            className="h-full w-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-[#158ed4]/40" />
        </div>

        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-3">
            <img
              src="/logo-gsg.png"
              alt="Logo"
              className="h-12 w-12 object-contain drop-shadow-md"
            />
            <h1 className="text-3xl font-black tracking-tight text-white">
              SISTEM HR<span className="text-[#158ed4]">.</span>
            </h1>
          </div>

          <h2 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-white lg:text-6xl">
            Human <br />
            <span className="bg-gradient-to-r from-[#158ed4] to-cyan-400 bg-clip-text text-transparent">
              Resource Management
            </span>
          </h2>
          <p className="max-w-md border-l-4 border-[#158ed4] pl-4 text-lg leading-relaxed text-slate-300">
            Sistem Manajemen Sumber Daya Manusia Gaharu Sempana Group. Kelola rekrutmen,
            penugasan, dan database karyawan dalam satu ekosistem yang terstruktur.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-500">
            &copy; 2026 Gaharu Sempana Group. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Kanan: Form ── */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-6 sm:p-12 md:min-h-0 md:w-1/2 lg:w-[45%]">
        <div className="w-full max-w-md">
          {/* Branding mobile */}
          <div className="mb-10 text-center md:hidden">
            <img
              src="/logo-gsg.png"
              alt="Logo"
              className="mx-auto mb-4 h-16 w-16 object-contain drop-shadow-lg"
            />
            <h1 className="mb-1 text-2xl font-black tracking-tight text-white">
              SISTEM HR<span className="text-[#158ed4]">.</span>
            </h1>
            <p className="text-sm text-slate-400">Gaharu Sempana Group</p>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-800/40 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#158ed4] via-cyan-500 to-blue-500" />

            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-white">Selamat Datang</h2>
              <p className="text-sm text-slate-400">
                Silahkan masukkan akun Anda yang terdaftar untuk melanjutkan.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                <span className="text-sm font-medium text-red-300">{error}</span>
              </div>
            )}

            <form onSubmit={(e) => void submit(e)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-[#158ed4]">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    className={`${inputBase} pl-11`}
                    placeholder="nama@gaharusempana.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-[#158ed4]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`${inputBase} pl-11 pr-12`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition-colors hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="group relative mt-4 w-full overflow-hidden rounded-2xl bg-[#158ed4] px-4 py-4 text-sm font-bold text-white shadow-lg shadow-[#158ed4]/40 transition-all disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {busy ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk ke Sistem'
                  )}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-8 text-center md:hidden">
            <p className="text-xs text-slate-500">
              &copy; 2026 Gaharu Sempana Group. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
