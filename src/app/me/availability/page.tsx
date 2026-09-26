'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MonthCalendar } from '@/components/MonthCalendar';
import { NeedsSetup, Loading } from '@/components/NeedsSetup';
import { SlotDraftBanner } from '@/components/SlotDraftBanner';
import { Tabs } from '@/components/Tabs';
import { TimeSelect } from '@/components/TimeSelect';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatDate, hhmm, toISODate, utcNowNaive, type Availability } from '@/lib/types';

/** 把 iso 日期往後推 n 週 */
function addWeeks(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n * 7);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export default function AvailabilityPage() {
  const { userId, loading, unconfigured } = useUser();

  const [rows, setRows] = useState<Availability[]>([]);
  const [tab, setTab] = useState<'open' | 'past'>('open');
  const [fetching, setFetching] = useState(true);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('18:00');
  const [repeat, setRepeat] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    const { data } = await supabaseBrowser()
      .from('availabilities')
      .select('*')
      .eq('user_id', userId)
      // 往回抓 90 天，才有「已結束」可以看；再舊的就不留在畫面上了
      .gte('date', (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return toISODate(d);
      })())
      .order('date')
      .order('start_time');
    setRows((data as Availability[]) ?? []);
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const marked = useMemo(() => new Set(rows.map((r) => r.date)), [rows]);

  /** 所有實際要寫入的日期 = 勾選的日子 × 重複週數 */
  const targetDates = useMemo(() => {
    const out = new Set<string>();
    picked.forEach((iso) => {
      for (let w = 0; w <= repeat; w++) out.add(addWeeks(iso, w));
    });
    return [...out].sort();
  }, [picked, repeat]);

  function toggle(iso: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(iso) ? next.delete(iso) : next.add(iso);
      return next;
    });
  }

  async function save() {
    if (!userId || !targetDates.length) return;
    if (end <= start) {
      setNote('結束時間要比開始時間晚');
      return;
    }
    setBusy(true);
    setNote(null);

    const payload = targetDates.map((date) => ({
      user_id: userId,
      date,
      start_time: start,
      end_time: end,
    }));

    // 同一天同時段重複勾選時忽略，不要報錯
    const { error } = await supabaseBrowser()
      .from('availabilities')
      .upsert(payload, { onConflict: 'user_id,date,start_time,end_time', ignoreDuplicates: true });

    setBusy(false);
    if (error) {
      setNote(`儲存失敗：${error.message}`);
      return;
    }
    setNote(`已新增 ${payload.length} 個時段`);
    setPicked(new Set());
    setRepeat(0);
    load();
  }

  async function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabaseBrowser().from('availabilities').delete().eq('id', id);
  }

  if (unconfigured) return <NeedsSetup />;
  if (loading || (userId && fetching)) return <Loading />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/me/availability" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  const nowUtc = utcNowNaive();
  const ended = (a: Availability) => !!a.ends_at_utc && a.ends_at_utc < nowUtc;

  const upcoming = rows.filter((r) => !ended(r));
  const past = rows.filter(ended);
  const shown = tab === 'open' ? upcoming : [...past].reverse(); // 歷史由新到舊

  const grouped = shown.reduce<Record<string, Availability[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 從空檔計算機過來的人，這裡把他點好的表直接填進去 */}
      <SlotDraftBanner userId={userId} onDone={load} />

      <header>
        <Link href="/me" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 我的頁面
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">我的空閒時段</h1>
        <p className="mt-1 text-sm text-ink-soft">
          點選有空的日子（可多選），設定時間後一次建立。想每週固定就打開「重複到未來幾週」。
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------------------------------------- 新增 */}
        <section className="card space-y-5 p-5">
          <MonthCalendar selected={picked} marked={marked} onToggle={toggle} />

          <div className="grid grid-cols-2 gap-3 border-t border-line pt-5">
            <div>
              <label className="label">從幾點</label>
              <TimeSelect value={start} onChange={setStart} />
            </div>
            <div>
              <label className="label">到幾點</label>
              <TimeSelect value={end} onChange={setEnd} />
            </div>
          </div>

          <div>
            <label className="label">重複到未來幾週（同星期幾）</label>
            <div className="flex gap-2">
              {[0, 1, 3, 7, 11].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRepeat(n)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                    repeat === n
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-line-strong text-ink-soft hover:border-brand-300'
                  }`}
                >
                  {n === 0 ? '不重複' : `${n + 1} 週`}
                </button>
              ))}
            </div>
          </div>

          {note && (
            <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{note}</p>
          )}

          <button
            onClick={save}
            disabled={busy || !targetDates.length}
            className="btn-primary w-full !py-3"
          >
            {busy
              ? '儲存中…'
              : targetDates.length
                ? `新增 ${targetDates.length} 個時段`
                : '先點選日期'}
          </button>

          {targetDates.length > 1 && (
            <p className="text-center text-xs text-ink-muted">
              {formatDate(targetDates[0])} ～ {formatDate(targetDates[targetDates.length - 1])}
              ，每次 {start}–{end}
            </p>
          )}
        </section>

        {/* ------------------------------------------------- 已建立 */}
        <section className="space-y-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'open', label: '可預約', count: upcoming.length },
              { key: 'past', label: '已結束', count: past.length },
            ]}
          />

          {shown.length === 0 ? (
            <div className="card px-6 py-10 text-center text-sm text-ink-soft">
              {rows.length === 0
                ? '還沒有任何時段。左邊點幾天試試 🦆'
                : tab === 'open'
                  ? '沒有還沒結束的時段了，左邊再擺幾個吧 🦆'
                  : '近 90 天內沒有已結束的時段。'}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([date, list]) => (
                <div key={date} className="card animate-rise p-4">
                  <p className="text-sm font-bold">{formatDate(date)}</p>
                  <ul className="mt-2 space-y-1.5">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {hhmm(a.start_time)}–{hhmm(a.end_time)}
                        </span>
                        {a.status === 'booked' && (
                          <span className="chip !bg-ok-bg !text-ok">已被預約</span>
                        )}

                        <button
                          onClick={() => remove(a.id)}
                          className="ml-auto text-xs font-semibold text-ink-muted hover:text-brand-600"
                        >
                          刪除
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
