'use client';

export type TabItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

/** 鴨窩、時段、服務、工作四個地方共用同一種分頁，避免各寫各的長歪。 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
}) {
  return (
    <div className="flex rounded-full bg-brand-100/70 p-1">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={value === it.key}
          className={`pill-tab ${value === it.key ? 'pill-tab-on' : 'pill-tab-off'}`}
        >
          {it.label}
          {it.count ? ` ${it.count}` : ''}
        </button>
      ))}
    </div>
  );
}
