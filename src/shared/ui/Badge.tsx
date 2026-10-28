import type { MrfStatus } from '@/features/recruitment/mrf/types';

const STATUS_MAP: Record<MrfStatus, {
  label: string;
  dot: string;
  bg: string;
  text: string;
  ring: string;
}> = {
  draft:           { label: 'Draft',             dot: 'bg-slate-400',  bg: 'bg-subtle',  text: 'text-body',  ring: 'ring-line'  },
  pending_manager: { label: 'Menunggu Manajer',   dot: 'bg-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30',   text: 'text-amber-800 dark:text-amber-400',  ring: 'ring-amber-200 dark:ring-amber-700'  },
  pending_ceo:     { label: 'Menunggu CEO',        dot: 'bg-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30',   text: 'text-amber-800 dark:text-amber-400',  ring: 'ring-amber-200 dark:ring-amber-700'  },
  revision:        { label: 'Perlu Revisi',        dot: 'bg-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30',  text: 'text-orange-800 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-700' },
  approved:        { label: 'Disetujui',           dot: 'bg-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-400',ring: 'ring-emerald-200 dark:ring-emerald-700'},
  cancelled:       { label: 'Dibatalkan',          dot: 'bg-muted',  bg: 'bg-subtle',   text: 'text-caption',  ring: 'ring-line'  },
};

interface BadgeProps {
  status: MrfStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: BadgeProps) {
  const s = STATUS_MAP[status];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${pad} ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

interface ActionBadgeProps {
  label?: string;
}

export function ActionBadge({ label = 'Perlu tindakan' }: ActionBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      {label}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'amber';
}

export function Badge({ children, variant = 'default' }: GenericBadgeProps) {
  const styles = {
    default: 'bg-subtle text-body ring-line',
    green:   'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700',
    red:     'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-700',
    amber:   'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}>
      {children}
    </span>
  );
}
