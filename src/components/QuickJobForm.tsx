'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, FEATURED } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CITIES, districtsOf } from '@/lib/taiwan';
import { toISODate } from '@/lib/types';

/**
 * 30 秒發需求。
 *
 * 完整的 JobForm 有 12 個欄位，對「只是想找人顧兩小時攤」的人來說太重了 ——
 * 站上長期 0 則工作，門檻是主因之一。這裡只問三件事：什麼事、什麼時候、哪裡。
 * 薪資一律先面議、徵 1 人，發完之後再引導去補細節。
 */

const PERIODS = [
  { key: 'am', label: '早上', time: '09:00–12:00', start: '09:00', end: '12:00' },
  { key: 'pm', label: '下午', time: '13:00–18:00', start: '13:00', end: '18:00' },
  { key: 'ni', label: '晚上', time: '19:00–22:00', start: '19:00', end: '22:00' },
] as const;

/** 今天 +n 天的 ISO 日期 */
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function dayLabel(iso: string, offset: number): string {
  if (offset === 0) return '今天';
  if (offset === 1) return '明天';
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
}

export function QuickJobForm({ userId }: { userId: string }) {
  const router = useRouter();

  const [category, setCategory] = useState(FEATURED[0]?.id ?? CATEGORIES[0].id);
  const [what, setWhat] = useState('');
  const [dayOffset, setDayOffset] = useState(1);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('pm');
  const [city, setCity] = useState('臺北市');
  const [district, setDistrict] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const districts = useMemo(() => districtsOf(city), [city]);
  const days = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((n) => ({ n, iso: inDays(n) })), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!district) return setErr('選一下行政區，對方才知道要不要接');

    const p = PERIODS.find((x) => x.key === period)!;
    const name = CATEGORIES.find((c) => c.id === category)?.name ?? '幫手';

    setBusy(true);
    setErr(null);

    const { data, error } = await supabaseBrowser()
      .from('jobs')
      .insert({
        employer_id: userId,
        category_id: category,
        // 標題沒填就用「分類 + 地點」湊一個看得懂的，之後可以改
        title: what.trim() || `找${name}（${district}）`,
        description: null,
        date: inDays(dayOffset),
        start_time: p.start,
        end_time: p.end,
        city,
        district,
        address_note: null,
        rate: null,
        rate_unit: 'negotiable',
        headcount: 1,
      })
      .select('id')
      .single();

    setBusy(false);
    if (error) return setErr(`發布失敗：${error.message}`);
    router.push(`/jobs/${data.id}?new=1`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ------------------------------------------------ 什麼事 */}
      <section>
        <label className="label">① 需要人做什麼</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                category === c.id
                  ? 'border-brand-400 bg-brand-500 text-white'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-brand-300'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        <input
          className="field mt-3"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="一句話就好：週六夜市顧攤、幫忙遛兩隻柴犬…（可留空）"
          maxLength={40}
        />
      </section>

      {/* ------------------------------------------------ 什麼時候 */}
      <section>
        <label className="label">② 什麼時候</label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days.map(({ n, iso }) => (
            <button
              key={n}
              type="button"
              onClick={() => setDayOffset(n)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                dayOffset === n
                  ? 'border-brand-400 bg-brand-500 text-white'
                  : 'border-line-strong bg-surface text-ink-soft'
              }`}
            >
              {dayLabel(iso, n)}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-xl border px-2 py-2.5 transition ${
                period === p.key
                  ? 'border-brand-400 bg-brand-500 text-white'
                  : 'border-line-strong bg-surface text-ink-soft'
              }`}
            >
              <span className="block text-sm font-bold">{p.label}</span>
              <span className="block text-[11px] opacity-80">{p.time}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ 哪裡 */}
      <section>
        <label className="label">③ 在哪裡</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="field"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict('');
            }}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          >
            <option value="">選行政區</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </section>

      {err && <p className="text-sm font-semibold text-brand-700">{err}</p>}

      <div className="space-y-2">
        <button type="submit" disabled={busy} className="btn-primary w-full !py-3 text-base">
          {busy ? '發布中…' : '發出去'}
        </button>
        <p className="text-center text-xs text-ink-muted">
          薪資先留「面議」，發完可以再補。也可以
          <Link href="/jobs/new" className="font-semibold text-brand-600 underline">
            填完整版
          </Link>
        </p>
      </div>
    </form>
  );
}
