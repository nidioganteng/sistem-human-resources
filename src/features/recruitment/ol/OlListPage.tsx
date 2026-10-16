import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/services/api';
import { listOls } from './olService';
import { OL_STATUS_LABELS } from './types';
import type { OfferingLetter, OlStatus } from './types';

const STATUS_BADGE: Record<OlStatus, 'default' | 'green' | 'red' | 'amber'> = {
  draft:       'default',
  pending_ceo: 'amber',
  revision:    'amber',
  approved:    'green',
  sent:        'green',
  accepted:    'green',
  declined:    'red',
  expired:     'red',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function OlListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<OfferingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listOls()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  const isCeo = user?.role === 'super_admin';

  const displayItems = isCeo
    ? items.filter((ol) => ol.status === 'pending_ceo' || ol.status === 'revision')
    : items;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Offering Letter</h1>
        <p className="page-subtitle mt-1">
          {isCeo ? 'OL yang menunggu persetujuan Anda' : 'Daftar semua Offering Letter yang dibuat'}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-400">Memuat...</p>
      ) : displayItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Mail size={22} />}
            title={isCeo ? 'Tidak ada OL yang perlu ditinjau' : 'Belum ada Offering Letter'}
            description={
              isCeo
                ? 'OL dari HR akan muncul di sini saat menunggu persetujuan.'
                : 'Buat OL dari halaman detail lowongan pada kandidat dengan status Siap OL.'
            }
          />
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-[#1c2333] dark:bg-[#0c1018]">
                <tr>
                  {['Posisi', 'Status', 'Dibuat', ''].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1c2333]">
                {displayItems.map((ol) => (
                  <tr key={ol.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2030]">
                    <td className="td font-medium text-slate-900 dark:text-white">{ol.position}</td>
                    <td className="td">
                      <Badge variant={STATUS_BADGE[ol.status]}>
                        {OL_STATUS_LABELS[ol.status]}
                      </Badge>
                    </td>
                    <td className="td text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(ol.createdAt)}
                    </td>
                    <td className="td text-right">
                      <Link
                        to={`/offering-letters/${ol.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {isCeo ? 'Tinjau' : 'Lihat'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
