import type { MrfStatus } from '@/features/recruitment/mrf/types';

interface Step {
  label: string;
  sublabel?: string;
  status: 'done' | 'active' | 'pending' | 'rejected';
}

interface ApprovalProgressProps {
  steps: Step[];
}

const DOT: Record<Step['status'], string> = {
  done:     'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40',
  active:   'bg-brand-600 ring-brand-100 dark:ring-brand-900/40 animate-pulse',
  pending:  'bg-slate-200 dark:bg-slate-700 ring-slate-50 dark:ring-slate-800',
  rejected: 'bg-red-400 ring-red-100 dark:ring-red-900/40',
};

const LABEL: Record<Step['status'], string> = {
  done:     'text-emerald-700 dark:text-emerald-400',
  active:   'text-brand-700 dark:text-brand-400 font-semibold',
  pending:  'text-slate-400 dark:text-slate-500',
  rejected: 'text-red-600 dark:text-red-400',
};

export function ApprovalProgress({ steps }: ApprovalProgressProps) {
  return (
    <ol className="flex items-center gap-0">
      {steps.map((step, i) => (
        <li key={i} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`h-3 w-3 rounded-full ring-4 ${DOT[step.status]}`} />
            <span className={`text-[11px] leading-tight text-center ${LABEL[step.status]}`}>
              {step.label}
              {step.sublabel && (
                <span className="block text-slate-400 dark:text-slate-500 font-normal">{step.sublabel}</span>
              )}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mb-4 h-px flex-1 mx-1 ${step.status === 'done' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

export function mrfStatusToSteps(status: MrfStatus, isManagerCreated: boolean): Step[] {
  const base: Array<{ label: string; doneOn: MrfStatus[] }> = isManagerCreated
    ? [
        { label: 'Draft',          doneOn: ['pending_ceo', 'approved'] },
        { label: 'Menunggu CEO',   doneOn: ['approved'] },
        { label: 'Disetujui',      doneOn: ['approved'] },
      ]
    : [
        { label: 'Draft',          doneOn: ['pending_manager', 'pending_ceo', 'approved'] },
        { label: 'Menunggu Manajer', doneOn: ['pending_ceo', 'approved'] },
        { label: 'Menunggu CEO',   doneOn: ['approved'] },
        { label: 'Disetujui',      doneOn: ['approved'] },
      ];

  if (status === 'revision' || status === 'cancelled') {
    return base.map((s) => ({ label: s.label, status: 'pending' as const }));
  }

  const doneSet = new Set<MrfStatus>();
  if (status === 'pending_manager') doneSet.add('pending_manager');
  if (status === 'pending_ceo') { doneSet.add('pending_manager'); doneSet.add('pending_ceo'); }
  if (status === 'approved') { doneSet.add('pending_manager'); doneSet.add('pending_ceo'); doneSet.add('approved'); }

  return base.map((s, i) => {
    const isDone = s.doneOn.includes(status);
    const isActive = !isDone && base[i - 1]?.doneOn.includes(status);
    return { label: s.label, status: isDone ? 'done' : isActive ? 'active' : 'pending' };
  });
}
