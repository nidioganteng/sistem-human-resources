import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canCreateMrf } from '@/auth/permissions';
import { StatusBadge } from '@/shared/ui/Badge';
import { Tabs } from '@/shared/ui/Tabs';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { fmtDate } from './format';
import { listMrfs } from './mrfService';
import type { Mrf, MrfStatus } from './types';

type TabKey = 'action' | '' | MrfStatus;

export default function MrfListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Mrf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const activeTab: TabKey = (searchParams.get('filter') ?? searchParams.get('status') ?? '') as TabKey;

  useEffect(() => {
    setLoading(true);
    const apiStatus: MrfStatus | '' = (activeTab === 'action' ? '' : activeTab) as MrfStatus | '';
    listMrfs(apiStatus)
      .then((r) => { setItems(r.items); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTab]);

  if (!user) return null;

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab === 'action') list = list.filter((m) => m.needsMyAction);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.code.toLowerCase().includes(q) || m.position.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeTab, query]);

  const countForTab = (key: TabKey) => {
    if (key === 'action') return items.filter((m) => m.needsMyAction).length;
    if (key === '') return items.length;
    return items.filter((m) => m.status === key).length;
  };

  const tabs = [
    { key: 'action', label: 'Perlu tindakan', count: countForTab('action') },
    { key: '',       label: 'Semua',           count: countForTab('') },
    { key: 'draft',          label: 'Draft' },
    { key: 'pending_manager', label: 'Menunggu Manajer' },
    { key: 'pending_ceo',    label: 'Menunggu CEO' },
    { key: 'revision',       label: 'Revisi' },
    { key: 'approved',       label: 'Disetujui' },
    { key: 'cancelled',      label: 'Dibatalkan' },
  ];

  const changeTab = (key: string) => {
    setQuery('');
    if (!key) {
      setSearchParams({});
    } else if (key === 'action') {
      setSearchParams({ filter: 'action' });
    } else {
      setSearchParams({ status: key });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">MRF</h1>
          <p className="page-subtitle mt-0.5">
            {user.role === 'hr'
              ? 'MRF yang sudah disetujui CEO dan siap dibuatkan lowongan.'
              : 'Permintaan tenaga kerja divisi{user.division ? ` ${user.division}` : ""}.'}
          </p>
        </div>
        {canCreateMrf(user.role) && (
          <Link to="/mrf/baru" className="btn-primary">
            <Plus size={16} /> Buat MRF
          </Link>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="card !p-0 overflow-hidden">
        <Tabs tabs={tabs} active={activeTab} onChange={changeTab} />

        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Cari kode MRF atau posisi"
              aria-label="Cari MRF"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field-input !pl-9 !py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Kode', 'Posisi', 'Divisi', 'Kebutuhan', 'Pemohon', 'Status', 'Diperbarui'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    Memuat...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={query ? 'Tidak ada hasil' : 'Belum ada MRF'}
                      description={query ? 'Coba kata kunci lain.' : 'MRF akan muncul di sini setelah dibuat.'}
                    />
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                    m.needsMyAction ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => { window.location.href = `/mrf/${m.id}`; }}
                >
                  <td className="td tabular-nums text-slate-500">{m.code}</td>
                  <td className="td">
                    <Link
                      className="font-semibold text-slate-900 hover:text-brand-700"
                      to={`/mrf/${m.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.position}
                    </Link>
                    {m.needsMyAction && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        Perlu tindakan
                      </span>
                    )}
                  </td>
                  <td className="td text-slate-600">{m.division}</td>
                  <td className="td whitespace-nowrap text-slate-600">{m.headcount} org · {m.employmentStatus}</td>
                  <td className="td">
                    <span className="text-slate-900">{m.requester.name}</span>
                    <span className="block text-xs text-slate-500">{m.requester.roleLabel}</span>
                  </td>
                  <td className="td"><StatusBadge status={m.status} /></td>
                  <td className="td whitespace-nowrap text-right text-slate-400">{fmtDate(m.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {loading ? 'Memuat...' : `${filtered.length} MRF ditampilkan`}
        </div>
      </div>
    </div>
  );
}
