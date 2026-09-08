'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { TimeSelect } from './TimeSelect';
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories';
import { CITIES, districtsOf } from '@/lib/taiwan';
import { toISODate } from '@/lib/types';

export type FilterValues = {
  date: string;
  start: string;
  end: string;
  category: string;
  city: string;
  district: string;
};

export function Filters({
  initial,
  basePath,
}: {
  initial: FilterValues;
  basePath: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<FilterValues>(initial);
  const [open, setOpen] = useState(false);

  const districts = useMemo(() => districtsOf(v.city), [v.city]);
  const activeCount = Object.values(v).filter(Boolean).length;

  function set<K extends keyof FilterValues>(k: K, value: string) {
    setV((p) => ({ ...p, [k]: value, ...(k === 'city' ? { district: '' } : null) }));
  }

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const q = new URLSearchParams();
    Object.entries(v).forEach(([k, val]) => val && q.set(k, val));
    router.push(q.toString() ? `${basePath}?${q}` : basePath);
    setOpen(false);
  }

  function clear() {
    const empty: FilterValues = { date: '', start: '', end: '', category: '', city: '', district: '' };
    setV(empty);
    router.push(basePath);
  }

  return (
    <form onSubmit={apply} className="card p-4">
      {/* 第一排：永遠顯示 */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label">哪一天</label>
          <input
            type="date"
            value={v.date}
            min={toISODate(new Date())}
            onChange={(e) => set('date', e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label">需要什麼</label>
          <select
            value={v.category}
            onChange={(e) => set('category', e.target.value)}
            className="field"
          >
            <option value="">不限分類</option>
            {CATEGORY_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {CATEGORIES.filter((c) => c.group === g).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary flex-1 sm:flex-none">
            搜尋
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="btn-ghost !px-3"
            aria-expanded={open}
          >
            更多{open ? ' ▴' : ' ▾'}
          </button>
        </div>
      </div>

      {/* 第二排：展開才顯示 */}
      {open && (
        <div className="animate-rise mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-4">
          <div>
            <label className="label">最早幾點</label>
            <TimeSelect value={v.start} onChange={(t) => set('start', t)} emptyLabel="不限" />
          </div>
          <div>
            <label className="label">最晚到幾點</label>
            <TimeSelect value={v.end} onChange={(t) => set('end', t)} emptyLabel="不限" />
          </div>
          <div>
            <label className="label">縣市</label>
            <select value={v.city} onChange={(e) => set('city', e.target.value)} className="field">
              <option value="">全台灣</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">行政區</label>
            <select
              value={v.district}
              onChange={(e) => set('district', e.target.value)}
              className="field"
              disabled={!districts.length}
            >
              <option value="">不限</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clear}
          className="mt-3 text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-brand-600"
        >
          清除全部條件
        </button>
      )}
    </form>
  );
}
