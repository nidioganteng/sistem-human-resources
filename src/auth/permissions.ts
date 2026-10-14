import type { Role } from '@/shared/types';

// Matriks hak akses menu. Murni data, tidak tahu soal React.
// Tambah modul baru: tambahkan item di sini dan rute di app/AppRoutes.tsx.
export interface MenuItem {
  to: string;
  label: string;
  roles: Role[];
}

export const MENU: MenuItem[] = [
  { to: '/', label: 'Beranda', roles: ['super_admin', 'hr', 'manajer', 'pic'] },
  { to: '/mrf', label: 'MRF', roles: ['super_admin', 'hr', 'manajer', 'pic'] },
  { to: '/lowongan', label: 'Lowongan', roles: ['hr'] },
];

export const menuFor = (role: Role): MenuItem[] => MENU.filter((m) => m.roles.includes(role));

export const canCreateMrf = (role: Role): boolean => role === 'manajer' || role === 'pic';
