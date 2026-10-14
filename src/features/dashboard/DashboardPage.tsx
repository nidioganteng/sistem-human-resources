import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { listMrfs } from '@/features/recruitment/mrf/mrfService';
import type { Mrf } from '@/features/recruitment/mrf/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Mrf[] | null>(null);

  useEffect(() => {
    listMrfs().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);

  if (!user) return null;

  const action   = items?.filter((m) => m.needsMyAction) ?? [];
  const waiting  = items?.filter((m) => m.status === 'pending_manager' || m.status === 'pending_ceo') ?? [];
  const approved = items?.filter((m) => m.status === 'approved') ?? [];

  const stats = [
    {
      label: 'Perlu tindakan Anda',
      value: items ? action.length : '...',
      icon: <Zap size={20} />,
      iconBg: 'bg-amber-100 dark:bg-amber-400/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Menunggu persetujuan',
      value: items ? waiting.length : '...',
      icon: <Clock size={20} />,
      iconBg: 'bg-sky-100 dark:bg-sky-400/15',
      iconColor: 'text-sky-700 dark:text-sky-400',
    },
    {
      label: 'MRF disetujui',
      value: items ? approved.length : '...',
      icon: <CheckCircle size={20} />,
      iconBg: 'bg-emerald-100 dark:bg-emerald-400/15',
      iconColor: 'text-emerald-700 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Halo, {user.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {user.roleLabel}{user.division ? ` · ${user.division}` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
              <div className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {action.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Perlu Tindakan Anda
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {action.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{m.position}</span>
                  <span className="ml-2 text-slate-400 dark:text-slate-500">{m.division}</span>
                </div>
                <Link
                  to={`/mrf/${m.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  Buka <ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
