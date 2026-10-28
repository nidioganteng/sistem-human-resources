interface Tab { key: string; label: string; count?: number; }
interface TabsProps { tabs: Tab[]; active: string; onChange: (key: string) => void; }

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="filter-tabs inline-flex w-max" role="group" aria-label="Filter tampilan">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => onChange(tab.key)}
            aria-pressed={tab.key === active}
            className={`filter-tab ${tab.key === active ? 'is-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab.key === active ? 'bg-accent-soft text-accent' : 'bg-muted/60 text-caption'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
