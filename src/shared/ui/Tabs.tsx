interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-[#1c2333]">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-[#1c2333] dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
