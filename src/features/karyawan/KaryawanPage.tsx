import { EmptyState } from '@/shared/ui/EmptyState';
import { UserCheck } from 'lucide-react';

export default function KaryawanPage() {
  return (
    <div>
      <h1 className="page-title">Karyawan</h1>
      <p className="page-subtitle mt-1">Database karyawan aktif Gaharu Sempana Group</p>
      <div className="card mt-6">
        <EmptyState
          icon={<UserCheck size={24} />}
          title="Modul karyawan belum tersedia"
          description="Fitur ini akan dibangun setelah alur onboarding karyawan baru selesai."
        />
      </div>
    </div>
  );
}
