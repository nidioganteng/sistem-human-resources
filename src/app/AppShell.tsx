import { BrandLogo } from '@/shared/ui/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Briefcase, ChevronRight, FileText, Home, LogOut, Mail, Menu,
  Moon, PanelLeftClose, PanelLeftOpen, Shield, Sun, UserCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/shared/ThemeContext';
import { menuFor } from '@/auth/permissions';

const ICON_MAP: Record<string, React.ReactNode> = {
  home: <Home size={19} />, 'file-text': <FileText size={19} />,
  briefcase: <Briefcase size={19} />, users: <Users size={19} />,
  'user-check': <UserCheck size={19} />, shield: <Shield size={19} />, mail: <Mail size={19} />,
};
const GROUPS = [
  { label: 'Workspace', paths: ['/'] },
  { label: 'Rekrutmen', paths: ['/mrf', '/lowongan', '/kandidat', '/offering-letters'] },
  { label: 'Organisasi', paths: ['/karyawan', '/pengguna'] },
];

function Sidebar({ compact = false, onCollapse, onClose }: {
  compact?: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  if (!user) return null;
  const menus = menuFor(user.role);

  return (
    <div className={`workspace-sidebar ${compact ? 'is-compact' : ''}`}>
      <div className="sidebar-brand">
        <NavLink to="/" onClick={onClose} aria-label="Sistem HR, Beranda" className="flex min-w-0 items-center gap-3">
          <span className="brand-mark"><BrandLogo alt="Logo GSG" className="h-8 w-8 object-contain" /></span>
          {!compact && <div className="min-w-0"><div className="brand-wordmark">SISTEM HR<span className="text-accent">.</span></div><p className="mt-0.5 text-[10px] text-caption">Gaharu Sempana Group</p></div>}
        </NavLink>
        {onClose && <button type="button" className="icon-button !h-8 !w-8" onClick={onClose} aria-label="Tutup sidebar"><X size={17} /></button>}
      </div>

      <div className="sidebar-workspace" title={compact ? 'Gaharu Sempana Group' : undefined}>
        <span className="workspace-initial">G</span>
        {!compact && <div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">Gaharu Sempana Group</p><p className="mt-1 text-[10px] text-caption">Human Resource Management</p></div>}
      </div>

      <nav aria-label="Navigasi utama" className="sidebar-menu scrollbar-hide">
        {GROUPS.map((group) => {
          const items = menus.filter((m) => group.paths.includes(m.to));
          if (!items.length) return null;
          return (
            <div key={group.label} className="sidebar-group" role="group" aria-label={group.label}>
              {!compact && <p className="sidebar-group-label">{group.label}</p>}
              {items.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.to === '/'} onClick={onClose}
                  title={compact ? m.label : undefined} aria-label={compact ? m.label : undefined}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
                  <span className="sidebar-link-icon">{ICON_MAP[m.icon]}</span>
                  {!compact && <><span className="flex-1">{m.label}</span><ChevronRight size={14} className="sidebar-link-arrow" /></>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {compact ? (
          <button type="button" className="sidebar-utility" onClick={toggle}
            aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        ) : (
          <button type="button" className="theme-toggle" role="switch" aria-checked={theme === 'dark'} aria-label="Mode gelap" onClick={toggle}>
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
              <span>{theme === 'dark' ? 'Mode gelap' : 'Mode terang'}</span>
            </span>
            <span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb" /></span>
          </button>
        )}
        <div className="sidebar-account">
          <span className="account-avatar" title={compact ? `${user.name} (${user.roleLabel})` : undefined}>{user.name.charAt(0).toUpperCase()}</span>
          {!compact && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink">{user.name}</p><p className="mt-1 truncate text-[10px] text-caption">{user.roleLabel}{user.division ? ` · ${user.division}` : ''}</p></div><button type="button" onClick={logout} className="sidebar-exit" aria-label="Keluar" title="Keluar"><LogOut size={16} /></button></>}
        </div>
        {compact && <button type="button" onClick={logout} className="sidebar-utility is-danger" aria-label="Keluar" title="Keluar"><LogOut size={18} /></button>}
        {onCollapse && <button type="button" onClick={onCollapse} className="sidebar-collapse" aria-label={compact ? 'Perluas sidebar' : 'Perkecil sidebar'} title={compact ? 'Perluas sidebar' : 'Perkecil sidebar'}>
          {compact ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={17} /><span>Perkecil sidebar</span></>}
        </button>}
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem('hr-sidebar-compact') === 'true'; } catch { return false; }
  });
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    try { localStorage.setItem('hr-sidebar-compact', String(compact)); } catch { /* Navigation works without storage. */ }
  }, [compact]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setMobileOpen(false); }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', handleResize);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', handleResize);
      (previous?.isConnected ? previous : triggerRef.current)?.focus();
    };
  }, [mobileOpen]);

  if (!user) return null;
  const current = menuFor(user.role).find((m) => m.to === '/' ? location.pathname === '/' : location.pathname.startsWith(m.to));
  return (
    <div className={`workspace-shell ${compact ? 'sidebar-compact' : ''}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-[100] focus:rounded-xl focus:bg-panel focus:p-3">Lewati navigasi</a>
      <aside className="desktop-sidebar" aria-label="Sidebar"><Sidebar compact={compact} onCollapse={() => setCompact(!compact)} /></aside>
      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        <div id="mobile-sidebar" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu navigasi" className="mobile-sidebar"><Sidebar onClose={() => setMobileOpen(false)} /></div>
      </div>}
      <div className="workspace-content">
        <div className="workspace-context">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={triggerRef} type="button" onClick={() => setMobileOpen(true)} className="icon-button lg:hidden" aria-label="Buka sidebar" aria-expanded={mobileOpen} aria-controls="mobile-sidebar"><Menu size={19} /></button>
            <div className="flex items-center gap-2 text-xs"><span className="hidden text-caption sm:inline">Workspace</span><ChevronRight size={13} className="hidden text-caption sm:block" /><span className="font-medium text-body">{current?.label ?? 'Detail'}</span></div>
          </div>
          <span className="workspace-role"><Shield size={12} /><span className="max-w-40 truncate">{user.roleLabel}{user.division ? ` · ${user.division}` : ''}</span></span>
        </div>
        <main id="main-content" className="workspace-main"><div key={location.pathname} className="page-enter"><Outlet /></div></main>
        <footer className="workspace-footer"><span>Gaharu Sempana Group</span><span>Sistem Manajemen Sumber Daya Manusia</span></footer>
      </div>
    </div>
  );
}
