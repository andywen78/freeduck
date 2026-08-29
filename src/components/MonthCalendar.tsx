'use client';

import { useMemo, useState } from 'react';
import { toISODate } from '@/lib/types';

const WD = ['日', '一', '二', '三', '四', '五', '六'];

export function MonthCalendar({
  selected,
  marked,
  onToggle,
}: {
  selected: Set<string>;
  /** 已經有時段的日子，顯示小圓點 */
  marked?: Set<string>;
  onToggle: (iso: string) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = first.getDay();
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const atFirstMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  function shift(n: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atFirstMonth}
          className="btn-ghost !px-3 !py-1.5 text-lg leading-none"
          aria-label="上個月"
        >
          ‹
        </button>
        <span className="font-bold">
          {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          className="btn-ghost !px-3 !py-1.5 text-lg leading-none"
          aria-label="下個月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-muted">
        {WD.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`x${i}`} />;
          const iso = toISODate(d);
          const past = d < today;
          const on = selected.has(iso);
          const has = marked?.has(iso);

          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onToggle(iso)}
              aria-pressed={on}
              className={`relative aspect-square rounded-xl text-sm font-semibold transition-all duration-150
                ${past ? 'cursor-not-allowed text-ink-muted/40' : ''}
                ${
                  on
                    ? 'scale-[1.06] bg-brand-500 text-white shadow-[0_4px_12px_-4px_rgb(237_79_43/0.6)]'
                    : past
                      ? ''
                      : 'bg-cream text-ink hover:bg-brand-100'
                }`}
            >
              {d.getDate()}
              {has && !on && (
                <span className="absolute inset-x-0 bottom-1.5 mx-auto h-1 w-1 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
