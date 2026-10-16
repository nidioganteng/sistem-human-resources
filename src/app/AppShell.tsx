import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Briefcase, FileText, Home, LogOut, Menu, Moon, Shield, Sun, UserCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/shared/ThemeContext';
import { menuFor } from '@/auth/permissions';

const ICON_MAP: Record<string, React.ReactNode> = {
  'home':       <Home size={18} />,
  'file-text':  <FileText size={18} />,
  'briefcase':  <Briefcase size={18} />,
  'users':      <Users size={18} />,
  'user-check': <UserCheck size={18} />,
  'shield':     <Shield size={18} />,
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  if (!user) return null;

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 dark:bg-[#0c1018]">
      {/* Header logo */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo-gsg.png"
            alt="Logo GSG"
            className="h-8 w-8 object-contain"
          />
          <div>
            <div className="font-heading text-sm font-bold tracking-tight text-white">
              SISTEM HR<span className="text-brand-400">.</span>
            </div>
            <div className="text-[10px] text-slate-500">Gaharu Sempana Group</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-white/8" />

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
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-brand-400' : 'text-slate-600'}>
                  {ICON_MAP[m.icon]}
                </span>
                {m.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 h-px bg-white/8" />

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
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
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800 dark:bg-[#080c12] dark:text-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col md:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-[#1c2333] dark:bg-[#0c1018] md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo-gsg.png" alt="Logo GSG" className="h-7 w-7 object-contain dark:brightness-0 dark:invert" />
              <span className="font-heading text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                SISTEM HR<span className="text-brand-600 dark:text-brand-400">.</span>
              </span>
            </div>
          </div>
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
