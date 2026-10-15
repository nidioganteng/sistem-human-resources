import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
}

const CONFIG: Record<AlertVariant, { icon: React.ReactNode; container: string; title: string; body: string }> = {
  info:    { icon: <Info size={16} />,        container: 'bg-brand-50 border-brand-200',    title: 'text-brand-800',   body: 'text-brand-700' },
  success: { icon: <CheckCircle size={16} />, container: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-800', body: 'text-emerald-700' },
  warning: { icon: <AlertCircle size={16} />, container: 'bg-amber-50 border-amber-200',    title: 'text-amber-800',   body: 'text-amber-700' },
  error:   { icon: <XCircle size={16} />,     container: 'bg-red-50 border-red-200',        title: 'text-red-800',     body: 'text-red-700' },
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
