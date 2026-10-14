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

  const action  = items?.filter((m) => m.needsMyAction) ?? [];
  const waiting = items?.filter((m) => m.status === 'pending_manager' || m.status === 'pending_ceo') ?? [];
  const approved = items?.filter((m) => m.status === 'approved') ?? [];

  const stats = [
    { label: 'Perlu tindakan Anda', value: items ? action.length : '...', icon: <Zap size={18} />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Menunggu persetujuan', value: items ? waiting.length : '...', icon: <Clock size={18} />, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: 'MRF disetujui', value: items ? approved.length : '...', icon: <CheckCircle size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Halo, {user.name}</h1>
        <p className="mt-0.5 text-sm text-slate-400">{user.roleLabel}{user.division ? ` · ${user.division}` : ''}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-0.5 text-2xl font-bold text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {action.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Menunggu Tindakan Anda</h2>
          <ul className="divide-y divide-white/5">
            {action.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-200">{m.position}</span>
                  <span className="ml-2 text-slate-500">{m.division}</span>
                </div>
                <Link
                  to={`/mrf/${m.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400"
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
