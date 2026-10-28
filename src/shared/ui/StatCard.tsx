import { ArrowRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  caption?: string;
  onClick?: () => void;
  highlight?: boolean;
}

export function StatCard({ label, value, caption, onClick, highlight = false }: StatCardProps) {
  const base = 'relative rounded-xl border p-4 transition-colors';
  const style = highlight
    ? 'border-brand-200 bg-brand-50 cursor-pointer hover:bg-brand-100'
    : 'border-line bg-panel shadow-card';

  const El = onClick ? 'button' : 'div';
  return (
    <El
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={`${base} ${style} ${onClick ? 'text-left w-full' : ''}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-caption">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight ? 'text-brand-700' : 'text-ink'}`}>
        {value}
      </p>
      {caption && (
        <p className={`mt-1 text-xs ${highlight ? 'text-brand-600' : 'text-caption'}`}>{caption}</p>
      )}
      {onClick && (
        <ArrowRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400" />
      )}
    </El>
  );
}
