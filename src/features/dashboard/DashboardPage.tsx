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
  cancelled:       'bg-muted',
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
      <section className="dashboard-hero glow-panel">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="section-pill"><Clock size={12} />{fmtToday()}</div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink md:text-[32px]">
              {fmtGreeting()}, <span className="gradient-text">{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-caption">
              {!loading && !err && action.length > 0
                ? `${action.length} MRF menunggu tindakan Anda.`
                : !loading && !err
                ? 'Semua MRF sudah ditindak lanjuti. Kerja bagus!'
                : 'Sistem HR Gaharu Sempana Group'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-end">
            {canCreateMrf(user.role) && <Link to="/mrf/baru" className="btn-primary"><Plus size={15} /> Buat MRF</Link>}
            {!loading && !err && action.length > 0 && <Link to="/mrf?filter=action" className="btn-secondary">Tinjau Sekarang <ArrowRight size={15} /></Link>}
          </div>
        </div>
      </section>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : err ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <BigStatCard
            label="Total MRF"
            value={total}
            icon={<FileText size={20} />}
            iconClass="bg-brand-50 text-brand-500 dark:bg-brand-900/30 dark:text-brand-400"
            to="/mrf"
          />
          <BigStatCard
            label="Perlu Tindakan"
            value={action.length}
            icon={<Zap size={20} />}
            iconClass="bg-accent-soft text-accent"
            highlight
            to="/mrf?filter=action"
          />
          <BigStatCard
            label="Menunggu Persetujuan"
            value={waiting.length}
            icon={<Clock size={20} />}
            iconClass="bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400"
            to="/mrf?filter=waiting"
          />
          <BigStatCard
            label="Disetujui"
            value={approved.length}
            icon={<CheckCircle size={20} />}
            iconClass="bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400"
            to="/mrf?status=approved"
          />
        </div>
      )}

      {/* ── Body: two-column ── */}
      {!loading && !err && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_272px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Menunggu Anda */}
            <div className="card !p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-semibold text-ink">Menunggu Anda</h2>
                  <p className="text-xs text-caption mt-0.5">
                    {action.length > 0
                      ? `${action.length} MRF memerlukan tindakan Anda`
                      : 'Semua sudah ditindak lanjuti'}
                  </p>
                </div>
                <Link to="/mrf?filter=action" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Lihat semua <ArrowRight size={13} />
                </Link>
              </div>

              {action.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-body">Tidak ada yang menunggu Anda</p>
                    <p className="mt-0.5 text-sm text-caption">Kami akan memberi tahu saat ada pengajuan baru.</p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {action.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/mrf/${m.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-subtle"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{m.position}</p>
                          <p className="text-xs text-caption">
                            {m.division} &nbsp;·&nbsp; {m.requester.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={m.status} size="sm" />
                          <ArrowRight size={15} className="text-caption" />
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
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 className="font-semibold text-ink">MRF Terkini</h2>
                  <Link to="/mrf" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                    Lihat semua <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="border-b border-line bg-subtle/70">
                      <tr>
                        <th className="th">Kode</th>
                        <th className="th">Posisi</th>
                        <th className="th">Divisi</th>
                        <th className="th">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {recent.map((m) => (
                        <tr key={m.id} className="transition-colors hover:bg-subtle">
                          <td className="td tabular-nums text-xs text-caption">{m.code}</td>
                          <td className="td">
                            <Link to={`/mrf/${m.id}`} className="font-medium text-ink hover:text-brand-700 dark:text-white dark:hover:text-brand-400">
                              {m.position}
                            </Link>
                            {m.needsMyAction && (
                              <span className="ml-2 inline-flex items-center rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Tindakan
                              </span>
                            )}
                          </td>
                          <td className="td text-caption">{m.division}</td>
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
                <h3 className="font-semibold text-ink">Ringkasan Status</h3>
                <div className="space-y-3">
                  {byStatus.map((s) => (
                    <div key={s.status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-body">{s.label}</span>
                        <span className="font-semibold text-ink">{s.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-subtle">
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
              <h3 className="font-semibold text-ink">Aksi Cepat</h3>
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
            <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="text-xs text-caption">
                    {user.roleLabel}{user.division ? ` · ${user.division}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-px bg-brand-100" />
              <p className="mt-3 text-xs leading-relaxed text-caption">
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
      className={`metric-card group ${highlight ? 'is-highlight' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
        <ArrowRight
          size={15}
          className="text-caption transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
        <p className="mt-1 text-xs font-medium text-caption">{label}</p>
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
          : 'text-body hover:bg-subtle hover:text-ink dark:hover:text-white'
      }`}
    >
      <span className={primary ? 'text-white' : 'text-caption'}>{icon}</span>
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
        <p className="font-semibold text-ink">Gagal memuat data</p>
        <p className="mt-0.5 text-sm text-caption">Server tidak dapat dihubungi. Periksa koneksi Anda.</p>
      </div>
      <button type="button" className="btn-primary mt-1" onClick={onRetry}>
        <RefreshCw size={15} /> Coba lagi
      </button>
    </div>
  );
}
