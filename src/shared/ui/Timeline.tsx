interface TimelineItem {
  label: string;
  sublabel?: string;
  timestamp: string;
  note?: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="relative ml-2 space-y-5 border-l border-line pl-5">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-100 dark:ring-brand-900/40" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              {item.sublabel && (
                <p className="text-xs text-caption">{item.sublabel}</p>
              )}
              {item.note && (
                <p className="mt-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40">
                  {item.note}
                </p>
              )}
            </div>
            <time className="shrink-0 text-[11px] text-caption">{item.timestamp}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}
