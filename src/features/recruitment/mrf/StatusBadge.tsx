import type { MrfStatus } from './types';

const STYLE: Record<MrfStatus, string> = {
  draft:           'bg-subtle text-body',
  pending_manager: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  pending_ceo:     'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  revision:        'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-400',
  approved:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400',
  cancelled:       'bg-subtle text-caption',
};

export const STATUS_LABEL: Record<MrfStatus, string> = {
  draft:           'Draft',
  pending_manager: 'Menunggu Manajer',
  pending_ceo:     'Menunggu CEO',
  revision:        'Perlu Revisi',
  approved:        'Disetujui',
  cancelled:       'Dibatalkan',
};

export default function StatusBadge({ status }: { status: MrfStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
