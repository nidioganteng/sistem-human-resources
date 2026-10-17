import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
}

const CONFIG: Record<AlertVariant, { icon: React.ReactNode; container: string; title: string; body: string }> = {
  info:    { icon: <Info size={16} />,        container: 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800',    title: 'text-brand-800 dark:text-brand-300',   body: 'text-brand-700 dark:text-brand-400' },
  success: { icon: <CheckCircle size={16} />, container: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', title: 'text-emerald-800 dark:text-emerald-300', body: 'text-emerald-700 dark:text-emerald-400' },
  warning: { icon: <AlertCircle size={16} />, container: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',    title: 'text-amber-800 dark:text-amber-300',   body: 'text-amber-700 dark:text-amber-400' },
  error:   { icon: <XCircle size={16} />,     container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',        title: 'text-red-800 dark:text-red-300',     body: 'text-red-700 dark:text-red-400' },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const c = CONFIG[variant];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${c.container}`}>
      <span className={`mt-0.5 shrink-0 ${c.title}`}>{c.icon}</span>
      <div>
        {title && <p className={`text-sm font-semibold ${c.title}`}>{title}</p>}
        <div className={`text-sm ${c.body} ${title ? 'mt-1' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
