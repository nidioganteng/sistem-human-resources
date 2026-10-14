import type { MrfStatus } from './types';

const STYLE: Record<MrfStatus, string> = {
  draft:           'bg-slate-700/60 text-slate-300',
  pending_manager: 'bg-amber-400/15 text-amber-400',
  pending_ceo:     'bg-amber-400/15 text-amber-400',
  revision:        'bg-orange-400/15 text-orange-400',
  approved:        'bg-emerald-400/15 text-emerald-400',
  cancelled:       'bg-slate-700/40 text-slate-500',
};

export const STATUS_LABEL: Record<MrfStatus, string> = {
  draft:           'Draft',
  pending_manager: 'Menunggu Manajer',
  pending_ceo:     'Menunggu CEO',
  revision:        'Perlu revisi',
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
