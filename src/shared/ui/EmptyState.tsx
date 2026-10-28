import { FileX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-caption">
        {icon ?? <FileX size={24} />}
      </div>
      <p className="text-sm font-semibold text-body">{title}</p>
      {description && <p className="mt-1 text-sm text-caption">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
