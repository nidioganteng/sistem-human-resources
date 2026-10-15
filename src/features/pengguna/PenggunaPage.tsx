import { EmptyState } from '@/shared/ui/EmptyState';
import { Shield } from 'lucide-react';

export default function PenggunaPage() {
  return (
    <div>
      <h1 className="page-title">Pengguna</h1>
      <p className="page-subtitle mt-1">Kelola akun dan hak akses pengguna sistem</p>
      <div className="card mt-6">
        <EmptyState
          icon={<Shield size={24} />}
          title="Modul pengguna belum tersedia"
          description="Pengelolaan pengguna lewat UI belum tersedia. Gunakan CLI untuk membuat akun baru."
        />
      </div>
    </div>
  );
}
