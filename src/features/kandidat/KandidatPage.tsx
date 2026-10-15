import { EmptyState } from '@/shared/ui/EmptyState';
import { Users } from 'lucide-react';

export default function KandidatPage() {
  return (
    <div>
      <h1 className="page-title">Kandidat</h1>
      <p className="page-subtitle mt-1">Daftar kandidat pelamar yang sedang dalam proses seleksi</p>
      <div className="card mt-6">
        <EmptyState
          icon={<Users size={24} />}
          title="Modul kandidat belum tersedia"
          description="Fitur ini akan dibangun setelah alur rekrutmen MRF selesai."
        />
      </div>
    </div>
  );
}
