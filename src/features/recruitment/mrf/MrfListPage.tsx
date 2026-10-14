import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canCreateMrf } from '@/auth/permissions';
import { fmtDate } from './format';
import { listMrfs } from './mrfService';
import StatusBadge, { STATUS_LABEL } from './StatusBadge';
import type { Mrf, MrfStatus } from './types';

export default function MrfListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Mrf[]>([]);
  const [status, setStatus] = useState<MrfStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listMrfs(status)
      .then((r) => { setItems(r.items); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title font-heading">Manpower Requisition Form</h1>
          <p className="page-subtitle mt-0.5">
            {user.role === 'hr'
              ? 'MRF yang sudah disetujui CEO dan siap dibuatkan lowongan.'
              : 'Pengajuan kebutuhan tenaga kerja.'}
          </p>
        </div>
        {canCreateMrf(user.role) && (
          <Link to="/mrf/baru" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Buat MRF
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="status" className="field-label !mb-0">Status</label>
        <select
          id="status"
          className="field-input !w-auto !py-1.5 !text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value as MrfStatus | '')}
        >
          <option value="">Semua</option>
          {(Object.keys(STATUS_LABEL) as MrfStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 dark:border-white/10">
              <tr>
                {['Kode', 'Posisi', 'Divisi', 'Jumlah', 'Pemohon', 'Status', 'Diperbarui'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    Memuat...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    Belum ada MRF.
                  </td>
                </tr>
              )}
              {items.map((m) => (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                    m.needsMyAction
                      ? 'bg-sky-50 dark:bg-sky-400/5'
                      : ''
                  }`}
                >
                  <td className="td">
                    <Link
                      className="font-mono text-xs font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                      to={`/mrf/${m.id}`}
                    >
                      {m.code}
                    </Link>
                  </td>
                  <td className="td font-medium text-slate-900 dark:text-slate-100">
                    <Link className="hover:text-sky-700 dark:hover:text-white" to={`/mrf/${m.id}`}>
                      {m.position}
                    </Link>
                    {m.needsMyAction && (
                      <span className="ml-2 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-400/20 dark:text-sky-400">
                        Perlu tindakan
                      </span>
                    )}
                  </td>
                  <td className="td text-slate-500 dark:text-slate-400">{m.division}</td>
                  <td className="td text-slate-500 dark:text-slate-400">{m.headcount} org · {m.employmentStatus}</td>
                  <td className="td text-slate-500 dark:text-slate-400">{m.requester.name}</td>
                  <td className="td"><StatusBadge status={m.status} /></td>
                  <td className="td text-slate-400 dark:text-slate-500">{fmtDate(m.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
