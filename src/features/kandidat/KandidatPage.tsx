import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useAuth } from '@/auth/AuthContext';
import { listCandidates } from '@/features/recruitment/vacancy/vacancyService';
import { APPLICANT_STATUS_LABELS } from '@/features/recruitment/vacancy/types';
import type { CandidateItem } from '@/features/recruitment/vacancy/types';

const STATUS_BADGE: Partial<Record<string, 'default' | 'green' | 'red' | 'amber'>> = {
  shortlisted:   'green',
  selection:     'green',
  offer_pending: 'default',
  offered:       'default',
  accepted:      'green',
  hired:         'green',
  not_selected:  'red',
  declined:      'red',
};

const PIPELINE_STATUSES = [
  'shortlisted', 'selection', 'offer_pending',
  'offered', 'accepted', 'hired', 'not_selected', 'declined',
] as const;

const TRACK_LABELS: Record<string, string> = {
  fast:   'Cepat',
  normal: 'Normal',
};

const STATUS_GROUPS: { label: string; statuses: string[] }[] = [
  { label: 'Kandidat Aktif',    statuses: ['shortlisted', 'selection'] },
  { label: 'Tahap Penawaran',   statuses: ['offer_pending', 'offered', 'accepted'] },
  { label: 'Bergabung',         statuses: ['hired'] },
  { label: 'Tidak Dilanjutkan', statuses: ['not_selected', 'declined'] },
];

export default function KandidatPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  useEffect(() => {
    listCandidates()
      .then(res => setItems(res.items))
      .catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  const divisions = Array.from(new Set(items.map(i => i.vacancyDivision))).sort();

  const filtered = items.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterDivision !== 'all' && i.vacancyDivision !== filterDivision) return false;
    return true;
  });

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    items: filtered.filter(i => g.statuses.includes(i.status)),
  })).filter(g => g.items.length > 0);

  const allActive = filterStatus === 'all' && filterDivision === 'all';

  return (
    <div>
      <h1 className="page-title">Kandidat</h1>
      <p className="page-subtitle mt-1">
        Daftar kandidat dalam pipeline seleksi
        {user?.role === 'manajer' && user.division ? ` - Divisi ${user.division}` : ''}
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="field-input py-1.5 pr-8 text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Semua status</option>
            {PIPELINE_STATUSES.map(s => (
              <option key={s} value={s}>{APPLICANT_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {user?.role !== 'manajer' && divisions.length > 1 && (
            <select
              className="field-input py-1.5 pr-8 text-sm"
              value={filterDivision}
              onChange={e => setFilterDivision(e.target.value)}
            >
              <option value="all">Semua divisi</option>
              {divisions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {!allActive && (
            <button
              className="text-sm text-brand-600 hover:underline"
              onClick={() => { setFilterStatus('all'); setFilterDivision('all'); }}
            >
              Reset filter
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-8 text-center text-sm text-slate-500">Memuat...</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card mt-6">
          <EmptyState
            icon={<Users size={24} />}
            title="Belum ada kandidat"
            description={
              allActive
                ? 'Kandidat akan muncul di sini setelah HR melakukan shortlist dari Form Pelamar.'
                : 'Tidak ada kandidat yang sesuai filter yang dipilih.'
            }
          />
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-6 space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.label} ({group.items.length})
              </h2>
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                      <th className="px-4 py-2.5 text-left font-medium">Nama</th>
                      <th className="px-4 py-2.5 text-left font-medium">Posisi</th>
                      <th className="px-4 py-2.5 text-left font-medium">Divisi</th>
                      <th className="px-4 py-2.5 text-left font-medium">Jalur</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium">Diperbarui</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.items.map(item => (
                      <CandidateRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          Total {filtered.length} kandidat ditampilkan
          {filtered.length !== items.length ? ` dari ${items.length}` : ''}.
        </p>
      )}
    </div>
  );
}

function CandidateRow({ item }: { item: CandidateItem }) {
  const updatedDate = new Date(item.createdAt).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-800">{item.fullName}</td>
      <td className="px-4 py-3 text-slate-600">{item.vacancyPosition}</td>
      <td className="px-4 py-3 text-slate-600">{item.vacancyDivision}</td>
      <td className="px-4 py-3 text-slate-600">
        {item.selectionTrack ? TRACK_LABELS[item.selectionTrack] ?? item.selectionTrack : '-'}
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_BADGE[item.status] ?? 'default'}>
          {APPLICANT_STATUS_LABELS[item.status] ?? item.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-slate-500">{updatedDate}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/lowongan/${item.vacancyId}`}
          className="text-xs text-brand-600 hover:underline"
        >
          Lihat Lowongan
        </Link>
      </td>
    </tr>
  );
}
