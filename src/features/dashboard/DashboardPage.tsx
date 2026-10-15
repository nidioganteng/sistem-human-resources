import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Plus, RefreshCw, ServerOff, Zap } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canCreateMrf } from '@/auth/permissions';
import { listMrfs } from '@/features/recruitment/mrf/mrfService';
import { StatusBadge } from '@/shared/ui/Badge';
import type { Mrf } from '@/features/recruitment/mrf/types';

function fmtGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function fmtToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Mrf[] | null>(null);
  const [err, setErr] = useState(false);

  const load = () => {
    setErr(false);
    listMrfs()
      .then((r) => setItems(r.items))
      .catch(() => setErr(true));
  };

  useEffect(load, []);

  if (!user) return null;

  const loading = items === null && !err;
  const action  = items?.filter((m) => m.needsMyAction) ?? [];
  const waiting = items?.filter((m) => m.status === 'pending_manager' || m.status === 'pending_ceo') ?? [];
  const approved = items?.filter((m) => m.status === 'approved') ?? [];
  const recent  = items?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">{fmtGreeting()}, {user.name.split(' ')[0]}</h1>
          <p className="page-subtitle">{fmtToday()} · {user.roleLabel}{user.division ? ` · ${user.division}` : ''}</p>
        </div>
        {canCreateMrf(user.role) && (
          <Link to="/mrf/baru" className="btn-primary">
            <Plus size={16} /> Buat MRF
          </Link>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-6" aria-busy="true">
          <div className="h-6 w-52 rounded-lg bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}
          </div>
          <div className="h-14 rounded-xl bg-slate-200" />
          <div className="h-14 rounded-xl bg-slate-200" />
        </div>
      )}

      {err && (
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <ServerOff size={22} />
          </span>
          <p className="font-semibold text-slate-800">Data beranda gagal dimuat</p>
          <p className="text-sm text-slate-500">Server sedang tidak dapat dihubungi. Periksa koneksi Anda.</p>
          <button type="button" className="btn-primary mt-1" onClick={load}>
            <RefreshCw size={15} /> Coba lagi
          </button>
        </div>
      )}

      {!loading && !err && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Perlu tindakan Anda"
              value={action.length}
              icon={<Zap size={18} />}
              iconClass="bg-amber-100 text-amber-600"
              active={action.length > 0}
              onClick={() => navigate('/mrf?filter=action')}
            />
            <StatCard
              label="Menunggu persetujuan"
              value={waiting.length}
              icon={<Clock size={18} />}
              iconClass="bg-sky-100 text-sky-700"
              onClick={() => navigate('/mrf?filter=waiting')}
            />
            <StatCard
              label="MRF disetujui"
              value={approved.length}
              icon={<CheckCircle size={18} />}
              iconClass="bg-emerald-100 text-emerald-700"
              onClick={() => navigate('/mrf?status=approved')}
            />
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Menunggu Anda</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {action.length > 0
                    ? `${action.length} MRF memerlukan tindakan Anda`
                    : 'Semua MRF sudah Anda tindak lanjuti'}
                </p>
              </div>
              <Link to="/mrf" className="text-xs font-semibold text-brand-700 hover:text-brand-600">
                Lihat semua MRF
              </Link>
            </div>

            {action.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle size={22} />
                </span>
                <p className="font-semibold text-slate-700">Tidak ada yang menunggu Anda</p>
                <p className="max-w-xs text-sm text-slate-500 leading-relaxed">
                  Kami akan memberi notifikasi saat ada pengajuan baru.
                </p>
              </div>
            ) : (
              <ul>
                {action.map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/mrf/${m.id}`}
                      className="flex items-center gap-4 border-b border-slate-50 px-5 py-4 transition-colors hover:bg-slate-50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 tabular-nums">{m.code}</span>
                          <StatusBadge status={m.status} size="sm" />
                        </div>
                        <p className="mt-1 font-semibold text-slate-900">{m.position}</p>
                        <p className="text-sm text-slate-500">{m.division} · {m.headcount} org · {m.requester.name}</p>
                      </div>
                      <span className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs">
                        Tinjau
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {recent.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">MRF Terkini</h2>
              </div>
              <ul>
                {recent.map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/mrf/${m.id}`}
                      className="grid grid-cols-[110px_1fr_auto] items-center gap-4 border-b border-slate-50 px-5 py-3.5 transition-colors hover:bg-slate-50 last:border-0"
                    >
                      <span className="text-sm text-slate-500 tabular-nums">{m.code}</span>
                      <span className="font-medium text-slate-900">{m.position}</span>
                      <StatusBadge status={m.status} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, iconClass, onClick, active = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const El = onClick ? 'button' : 'div';
  return (
    <El
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card flex items-center gap-4 transition-colors w-full text-left ${onClick ? 'cursor-pointer hover:border-brand-300' : ''} ${active ? 'border-brand-200 bg-brand-50' : ''}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-medium ${active ? 'text-brand-700' : 'text-slate-500'}`}>{label}</p>
        <p className={`mt-0.5 text-2xl font-bold ${active ? 'text-brand-800' : 'text-slate-900'}`}>{value}</p>
      </div>
    </El>
  );
}
