import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Briefcase, FileText, Home, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { menuFor } from '@/auth/permissions';

const MENU_ICONS: Record<string, React.ReactNode> = {
  '/': <Home size={18} />,
  '/mrf': <FileText size={18} />,
  '/lowongan': <Briefcase size={18} />,
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo-gsg.png"
            alt="Logo"
            className="h-8 w-8 object-contain"
          />
          <div>
            <div className="text-sm font-black tracking-tight text-white">
              SISTEM HR<span className="text-[#158ed4]">.</span>
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

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Nav */}
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
                  ? 'bg-[#158ed4]/15 text-[#158ed4] shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[#158ed4]' : 'text-slate-500'}>
                  {MENU_ICONS[m.to]}
                </span>
                {m.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#158ed4]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* User */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#158ed4]/20 text-sm font-bold text-[#158ed4]">
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
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-slate-900 md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-slate-900 shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-gsg.png" alt="Logo" className="h-7 w-7 object-contain" />
            <span className="text-sm font-black tracking-tight text-white">
              SISTEM HR<span className="text-[#158ed4]">.</span>
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
