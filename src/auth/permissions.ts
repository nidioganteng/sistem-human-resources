import type { Role } from '@/shared/types';

export interface MenuItem {
  to: string;
  label: string;
  roles: Role[];
  icon: string;
}

export const MENU: MenuItem[] = [
  { to: '/',          label: 'Beranda',  icon: 'home',       roles: ['super_admin', 'hr', 'manajer', 'pic'] },
  { to: '/mrf',       label: 'MRF',      icon: 'file-text',  roles: ['super_admin', 'hr', 'manajer', 'pic'] },
  { to: '/lowongan',  label: 'Lowongan', icon: 'briefcase',  roles: ['hr', 'super_admin'] },
  { to: '/kandidat',         label: 'Kandidat',        icon: 'users',      roles: ['super_admin', 'hr', 'manajer'] },
  { to: '/offering-letters', label: 'Offering Letter', icon: 'mail',       roles: ['hr', 'super_admin'] },
  { to: '/karyawan',         label: 'Karyawan',        icon: 'user-check', roles: ['super_admin', 'hr'] },
  { to: '/pengguna',         label: 'Pengguna',        icon: 'shield',     roles: ['super_admin'] },
];

export const menuFor = (role: Role): MenuItem[] => MENU.filter((m) => m.roles.includes(role));

export const canCreateMrf = (role: Role): boolean => role === 'manajer' || role === 'pic';
