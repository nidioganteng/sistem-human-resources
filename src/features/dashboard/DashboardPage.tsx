import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Briefcase, CheckCircle, Clock, FileText,
  Plus, RefreshCw, ServerOff, Users, Zap,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canCreateMrf } from '@/auth/permissions';
import { listMrfs } from '@/features/recruitment/mrf/mrfService';
import { StatusBadge } from '@/shared/ui/Badge';
import type { Mrf, MrfStatus } from '@/features/recruitment/mrf/types';

function fmtGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function fmtToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Makassar',
  });
}

const STATUS_BAR_COLORS: Partial<Record<MrfStatus, string>> = {
  draft:           'bg-slate-400',
  pending_manager: 'bg-amber-400',
  pending_ceo:     'bg-amber-500',
  revision:        'bg-orange-400',
  approved:        'bg-emerald-500',
  cancelled:       'bg-slate-300',
};

const STATUS_LABELS: Partial<Record<MrfStatus, string>> = {
  draft:           'Draft',
  pending_manager: 'Menunggu Manajer',
  pending_ceo:     'Menunggu CEO',
  revision:        'Perlu Revisi',
  approved:        'Disetujui',
  cancelled:       'Dibatalkan',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Mrf[] | null>(null);
  const [err, setErr] = useState(false);

  const load = () => {
    setErr(false);
    setItems(null);
    listMrfs()
      .then((r) => setItems(r.items))
      .catch(() => setErr(true));
  };

  useEffect(load, []);

  if (!user) return null;

  const loading = items === null && !err;
  const action   = items?.filter((m) => m.needsMyAction) ?? [];
  const waiting  = items?.filter((m) => m.status === 'pending_manager' || m.status === 'pending_ceo') ?? [];
  const approved = items?.filter((m) => m.status === 'approved') ?? [];
  const total    = items?.length ?? 0;

  const byStatus = items
    ? (Object.keys(STATUS_LABELS) as MrfStatus[]).map((s) => ({
        status: s,
        label: STATUS_LABELS[s]!,
        count: items.filter((m) => m.status === s).length,
        color: STATUS_BAR_COLORS[s]!,
      })).filter((x) => x.count > 0)
    : [];

  const recent = items?.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-7 py-7">
        {/* dekorasi lingkaran */}
        <span className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5" />
        <span className="pointer-events-none absolute -bottom-8 right-24 h-36 w-36 rounded-full bg-white/5" />
        <span className="pointer-events-none absolute right-10 top-8 h-24 w-24 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute right-36 -bottom-4 h-16 w-16 rounded-full bg-white/10" />

        {/* ikon dekoratif kanan */}
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-3 opacity-20">
          <FileText size={48} className="text-white" strokeWidth={1.2} />
        </div>

        <div className="relative max-w-lg">
          <p className="text-sm font-medium text-brand-200">{fmtToday()}</p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {fmtGreeting()}, {user.name.split(' ')[0]}!
          </h1>
          <p className="mt-1.5 text-sm text-brand-200 leading-relaxed">
            {!loading && !err && action.length > 0
              ? `Anda memiliki ${action.length} MRF yang menunggu tindakan hari ini.`
              : !loading && !err
              ? 'Semua MRF sudah ditindak lanjuti. Kerja bagus!'
              : `${user.roleLabel}${user.division ? ` · ${user.division}` : ''}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canCreateMrf(user.role) && (
              <Link
                to="/mrf/baru"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                <Plus size={15} /> Buat MRF
              </Link>
            )}
            {action.length > 0 && (
              <Link
                to="/mrf?filter=action"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Tinjau Sekarang <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : err ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BigStatCard
            label="Total MRF"
            value={total}
            icon={<FileText size={20} />}
            iconClass="bg-slate-100 text-slate-500"
            to="/mrf"
          />
          <BigStatCard
            label="Perlu Tindakan"
            value={action.length}
            icon={<Zap size={20} />}
            iconClass="bg-white/20 text-white"
            highlight
            to="/mrf?filter=action"
          />
          <BigStatCard
            label="Menunggu Persetujuan"
            value={waiting.length}
            icon={<Clock size={20} />}
            iconClass="bg-amber-100 text-amber-600"
            to="/mrf?filter=waiting"
          />
          <BigStatCard
            label="Disetujui"
            value={approved.length}
            icon={<CheckCircle size={20} />}
            iconClass="bg-emerald-100 text-emerald-600"
            to="/mrf?status=approved"
          />
        </div>
      )}

      {/* ── Body: two-column ── */}
      {!loading && !err && (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Menunggu Anda */}
            <div className="card !p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Menunggu Anda</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {action.length > 0
                      ? `${action.length} MRF memerlukan tindakan Anda`
                      : 'Semua sudah ditindak lanjuti'}
                  </p>
                </div>
                <Link to="/mrf?filter=action" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Lihat semua <ArrowRight size={13} />
                </Link>
              </div>

              {action.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                    <CheckCircle size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-700">Tidak ada yang menunggu Anda</p>
                    <p className="mt-0.5 text-sm text-slate-400">Kami akan memberi tahu saat ada pengajuan baru.</p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {action.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/mrf/${m.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{m.position}</p>
                          <p className="text-xs text-slate-500">
                            {m.division} &nbsp;·&nbsp; {m.requester.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={m.status} size="sm" />
                          <ArrowRight size={15} className="text-slate-300" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* MRF Terkini */}
            {recent.length > 0 && (
              <div className="card !p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">MRF Terkini</h2>
                  <Link to="/mrf" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Lihat semua <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="border-b border-slate-50 bg-slate-50/70">
                      <tr>
                        <th className="th">Kode</th>
                        <th className="th">Posisi</th>
                        <th className="th">Divisi</th>
                        <th className="th">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recent.map((m) => (
                        <tr key={m.id} className="transition-colors hover:bg-slate-50">
                          <td className="td tabular-nums text-xs text-slate-500">{m.code}</td>
                          <td className="td">
                            <Link to={`/mrf/${m.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                              {m.position}
                            </Link>
                            {m.needsMyAction && (
                              <span className="ml-2 inline-flex items-center rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Tindakan
                              </span>
                            )}
                          </td>
                          <td className="td text-slate-500">{m.division}</td>
                          <td className="td"><StatusBadge status={m.status} size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Ringkasan status */}
            {byStatus.length > 0 && (
              <div className="card space-y-4">
                <h3 className="font-semibold text-slate-900">Ringkasan Status</h3>
                <div className="space-y-3">
                  {byStatus.map((s) => (
                    <div key={s.status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{s.label}</span>
                        <span className="font-semibold text-slate-900">{s.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${s.color}`}
                          style={{ width: total > 0 ? `${(s.count / total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aksi cepat */}
            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-900">Aksi Cepat</h3>
              <QuickLink to="/mrf" icon={<FileText size={16} />} label="Daftar MRF" />
              {canCreateMrf(user.role) && (
                <QuickLink to="/mrf/baru" icon={<Plus size={16} />} label="Buat MRF Baru" primary />
              )}
              {(user.role === 'hr' || user.role === 'super_admin') && (
                <QuickLink to="/lowongan" icon={<Briefcase size={16} />} label="Kelola Lowongan" />
              )}
              {(user.role === 'super_admin' || user.role === 'hr' || user.role === 'manajer') && (
                <QuickLink to="/kandidat" icon={<Users size={16} />} label="Lihat Kandidat" />
              )}
            </div>

            {/* Info peran */}
            <div className="rounded-2xl bg-brand-950 p-4 text-sm text-brand-300">
              <p className="font-semibold text-white">{user.name}</p>
              <p className="mt-0.5 text-xs">
                {user.roleLabel}{user.division ? ` · ${user.division}` : ''}
              </p>
              <div className="mt-3 h-px bg-white/10" />
              <p className="mt-3 text-xs leading-relaxed text-brand-400">
                {user.role === 'pic' && 'Anda dapat membuat dan mengajukan MRF untuk divisi Anda.'}
                {user.role === 'manajer' && 'Anda dapat menyetujui atau meminta revisi MRF dari PIC divisi Anda.'}
                {user.role === 'hr' && 'Anda dapat membuka lowongan dari MRF yang sudah disetujui CEO.'}
                {user.role === 'super_admin' && 'Anda memiliki akses penuh ke seluruh sistem HR.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-komponen ── */

function BigStatCard({
  label, value, icon, iconClass, highlight = false, to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
  highlight?: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col gap-3 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? 'border-brand-500 bg-brand-600 text-white'
          : 'border-slate-200 bg-white'
      }`}
      style={highlight ? undefined : { boxShadow: '0 1px 2px rgb(15 23 42 / 0.04)' }}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
        <ArrowRight
          size={15}
          className={`transition-transform group-hover:translate-x-0.5 ${highlight ? 'text-white/60' : 'text-slate-300'}`}
        />
      </div>
      <div>
        <p className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <p className={`mt-0.5 text-xs font-medium ${highlight ? 'text-brand-200' : 'text-slate-500'}`}>{label}</p>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon, label, primary = false }: {
  to: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        primary
          ? 'bg-brand-600 text-white hover:bg-brand-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={primary ? 'text-white' : 'text-slate-400'}>{icon}</span>
      {label}
    </Link>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-400">
        <ServerOff size={22} />
      </span>
      <div>
        <p className="font-semibold text-slate-800">Gagal memuat data</p>
        <p className="mt-0.5 text-sm text-slate-500">Server tidak dapat dihubungi. Periksa koneksi Anda.</p>
      </div>
      <button type="button" className="btn-primary mt-1" onClick={onRetry}>
        <RefreshCw size={15} /> Coba lagi
      </button>
    </div>
  );
}
