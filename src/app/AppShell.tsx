import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Briefcase, FileText, Home, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { menuFor } from '@/auth/permissions';
import { useTheme } from '@/shared/ThemeContext';

const MENU_ICONS: Record<string, React.ReactNode> = {
  '/': <Home size={18} />,
  '/mrf': <FileText size={18} />,
  '/lowongan': <Briefcase size={18} />,
};

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    </button>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <div className="flex h-full flex-col bg-[#0F172A]">
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo-gsg.png"
            alt="Logo GSG"
            className="h-8 w-8 object-contain"
          />
          <div>
            <div className="font-heading text-sm font-bold tracking-tight text-white">
              SISTEM HR<span className="text-sky-400">.</span>
            </div>
            <div className="text-[10px] text-slate-500">Gaharu Sempana Group</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-white/10" />

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {menuFor(user.role).map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-400/15 text-sky-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-sky-400' : 'text-slate-500'}>
                  {MENU_ICONS[m.to]}
                </span>
                {m.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 h-px bg-white/10" />

      <div className="px-3 py-3">
        <ThemeToggle />
      </div>

      <div className="mx-4 h-px bg-white/10" />

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-sm font-bold text-sky-400">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user.name}</div>
            <div className="text-[11px] text-slate-500">
              {user.roleLabel}{user.division ? ` · ${user.division}` : ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 dark:bg-[#0B1120] dark:text-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#0F172A] md:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#0F172A] shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-gsg.png" alt="Logo GSG" className="h-7 w-7 object-contain" />
            <span className="font-heading text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              SISTEM HR<span className="text-sky-700 dark:text-sky-400">.</span>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
