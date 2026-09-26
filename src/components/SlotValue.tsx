'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { categoryOf } from '@/lib/categories';
import { RATES, hourlyEquivalent, rateOf, UNIT_LABEL, type RateRef } from '@/lib/rates';

/**
 * 空檔計算機。
 *
 * 這頁表面上是個玩具，實際上是註冊流程裡最麻煩的那一步（填時段）——
 * 先讓人把格子點完、看到數字，才請他建檔案。順序反過來，願意填的人會多很多。
 *
 * 數字一律往保守抓：算出來的錢如果比實際低，使用者是驚喜；反過來就是失望，
 * 而且會怪到平台頭上。
 */

const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 一天切三段。時數是實際可接案的長度，不是整段時間 */
const PERIODS = [
  { key: 'am', label: '早', time: '09:00–12:00', start: '09:00', end: '12:00', hours: 3 },
  { key: 'pm', label: '午', time: '13:00–18:00', start: '13:00', end: '18:00', hours: 5 },
  { key: 'ni', label: '晚', time: '19:00–22:00', start: '19:00', end: '22:00', hours: 3 },
] as const;

/** 可以拿來試算的分類：有行情參考值的才列，不然算出來的數字沒根據 */
const PICKABLE = RATES.map((r) => r.category).filter((id) => categoryOf(id));

/** 一次服務大概收多少。時薪制的抓 2 小時當一個單位，比較接近真實接案的樣子 */
function perSession(r: RateRef): { amount: number; hours: number } {
  if (r.unit === 'hourly') return { amount: r.typical * 2, hours: 2 };
  return { amount: r.typical, hours: r.hours };
}

const money = (n: number) => `$${Math.round(n).toLocaleString('zh-TW')}`;

export function SlotValue() {
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<string[]>([]);
  const [perWeek, setPerWeek] = useState(2);

  function toggleCell(key: string) {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSkill(id: string) {
    setSkills((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= 3 ? prev : [...prev, id];
    });
  }

  const weekHours = useMemo(() => {
    let h = 0;
    picks.forEach((key) => {
      const p = PERIODS.find((x) => x.key === key.split('-')[1]);
      if (p) h += p.hours;
    });
    return h;
  }, [picks]);

  const yearHours = weekHours * 52;
  const yearDays = Math.round(yearHours / 24);

  /** 選到的服務裡，換算成時薪最高的那一個 —— 拿它來試算最有說服力 */
  const best = useMemo(() => {
    const refs = skills.map(rateOf).filter((r): r is RateRef => !!r);
    if (!refs.length) return null;
    return refs.reduce((a, b) => (hourlyEquivalent(b) > hourlyEquivalent(a) ? b : a));
  }, [skills]);

  const session = best ? perSession(best) : null;

  /** 一週接幾次，不能超過你實際有空的時數 */
  const maxPerWeek = session ? Math.max(1, Math.floor(weekHours / session.hours)) : 1;
  const times = Math.min(perWeek, maxPerWeek);
  const monthly = session ? session.amount * times * 4.3 : 0;

  function saveDraft() {
    const byPeriod = PERIODS.map((p) => ({
      start: p.start,
      end: p.end,
      weekdays: [...picks]
        .filter((k) => k.endsWith(`-${p.key}`))
        .map((k) => Number(k.split('-')[0]))
        .sort((a, b) => a - b),
    })).filter((g) => g.weekdays.length);

    try {
      sessionStorage.setItem('freeduck.slot_draft', JSON.stringify({ groups: byPeriod, skills }));
    } catch {
      // 無痕視窗會擋 sessionStorage。擋掉也只是少了預填，註冊流程照走
    }
  }

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------- 一、點格子 */}
      <section>
        <h2 className="text-lg font-black">① 點出你通常有空的時段</h2>
        <p className="mt-1 text-sm text-ink-soft">不用很準，抓個大概就好。</p>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[320px]">
            <div className="grid grid-cols-[2.2rem_repeat(7,1fr)] gap-1.5">
              <div />
              {DAYS.map((d) => (
                <div key={d} className="pb-1 text-center text-xs font-bold text-ink-muted">
                  {d}
                </div>
              ))}

              {PERIODS.map((p) => (
                <FragmentRow
                  key={p.key}
                  period={p}
                  picks={picks}
                  onToggle={toggleCell}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {weekHours === 0 ? (
            <p className="text-sm text-ink-muted">點幾格看看 ↑</p>
          ) : (
            <>
              <span className="text-3xl font-black text-brand-600">{weekHours}</span>
              <span className="font-bold">小時／週</span>
              <span className="text-sm text-ink-soft">
                一年 {yearHours.toLocaleString('zh-TW')} 小時，等於 {yearDays} 個整天
              </span>
            </>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- 二、選技能 */}
      {weekHours > 0 && (
        <section>
          <h2 className="text-lg font-black">② 這些時間，你可以做什麼？</h2>
          <p className="mt-1 text-sm text-ink-soft">最多選 3 項。沒有完全符合的就挑最接近的。</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {PICKABLE.map((id) => {
              const c = categoryOf(id)!;
              const on = skills.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSkill(id)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    on
                      ? 'border-brand-400 bg-brand-500 text-white'
                      : 'border-line-strong bg-surface text-ink-soft hover:border-brand-300'
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- 三、結果 */}
      {weekHours > 0 && best && session && (
        <section className="card border-brand-200 bg-brand-50/50 p-5 sm:p-6">
          <h2 className="text-lg font-black">③ 這些空檔大概值多少</h2>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-soft">一週接</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n > maxPerWeek}
                  onClick={() => setPerWeek(n)}
                  className={`h-9 w-9 rounded-lg text-sm font-bold transition disabled:opacity-30 ${
                    times === n
                      ? 'bg-brand-500 text-white'
                      : 'border border-line-strong bg-surface text-ink-soft'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-ink-soft">
              次{categoryOf(best.category)?.name}，一次約 {session.hours} 小時
            </span>
          </div>

          <p className="mt-5 text-4xl font-black tracking-tight text-brand-600">
            一個月 +{money(monthly)}
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            一年約 {money(monthly * 12)}，而且只用掉你空檔的{' '}
            {Math.round(((session.hours * times) / weekHours) * 100)}%
          </p>

          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
            以 {categoryOf(best.category)?.name} {money(best.typical)}／{UNIT_LABEL[best.unit]} 估算。
            {best.note ? `${best.note}。` : ''}
            來源：{best.source}。這是參考區間偏低處，實際看你的經驗、地區與需求而定。
          </p>

          <Link
            href="/signup?next=/me/availability"
            onClick={saveDraft}
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            把這張表變成我的檔案
          </Link>
          <p className="mt-2 text-xs text-ink-muted">
            剛才點的格子會幫你填好，不用重點一次。
          </p>
        </section>
      )}

      {weekHours > 0 && !best && (
        <p className="text-sm text-ink-muted">選一項你會做的事，就能看到估算 ↑</p>
      )}
    </div>
  );
}

/** 一整列（一個時段 × 七天）。拆出來只是為了讓上面的 grid 讀得下去 */
function FragmentRow({
  period,
  picks,
  onToggle,
}: {
  period: (typeof PERIODS)[number];
  picks: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-center text-xs font-bold text-ink-muted">
        {period.label}
      </div>
      {DAYS.map((_, i) => {
        const key = `${i}-${period.key}`;
        const on = picks.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-label={`週${DAYS[i]} ${period.label} ${period.time}`}
            onClick={() => onToggle(key)}
            className={`aspect-square rounded-lg border transition-all duration-100 active:scale-95 ${
              on
                ? 'border-brand-500 bg-brand-500 shadow-[0_2px_8px_-2px_rgb(237_79_43/0.5)]'
                : 'border-line-strong bg-surface hover:border-brand-300 hover:bg-brand-50'
            }`}
          />
        );
      })}
    </>
  );
}
