'use client';

import { useState, useSyncExternalStore } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toISODate } from '@/lib/types';

/**
 * 接住空檔計算機留下的那張表。
 *
 * 計算機的按鈕承諾「剛才點的格子會幫你填好」—— 這裡就是兌現的地方。
 * 沒有草稿就什麼都不顯示，所以一般進來的人看不到這塊。
 */

const KEY = 'freeduck.slot_draft';
const WEEKS = 4;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

type Group = { start: string; end: string; weekdays: number[] };
type Draft = { groups: Group[] };

/** 計算機的 0=週一，Date 的 0=週日，換算一下 */
function toJsDay(mondayBased: number): number {
  return (mondayBased + 1) % 7;
}

/** 從今天起算，未來 WEEKS 週內符合這些星期幾的日期 */
function datesFor(weekdays: number[]): string[] {
  const want = new Set(weekdays.map(toJsDay));
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < WEEKS * 7; i++) {
    if (want.has(d.getDay())) out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** sessionStorage 也是外部系統。這裡在頁面存活期間不會被別人改，所以不必訂閱 */
function noopSubscribe(): () => void {
  return () => {};
}

function readDraft(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;   // 無痕視窗會擋，當作沒有草稿
  }
}

export function SlotDraftBanner({ userId, onDone }: { userId: string; onDone: () => void }) {
  // 伺服器端一律回 null，避免 hydration 對不起來
  const raw = useSyncExternalStore(noopSubscribe, readDraft, () => null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  let draft: Draft | null = null;
  if (!dismissed && raw) {
    try {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed?.groups?.length) draft = parsed;
    } catch {
      // 草稿壞掉就當作沒有，不要擋住正常的頁面
    }
  }

  if (!draft) return null;

  const total = draft.groups.reduce((n, g) => n + g.weekdays.length * WEEKS, 0);

  function dismiss() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* 清不掉也無妨，dismissed 會擋住 */
    }
    setDismissed(true);
  }

  async function apply() {
    if (!draft) return;
    setBusy(true);
    setErr(null);

    const payload = draft.groups.flatMap((g) =>
      datesFor(g.weekdays).map((date) => ({
        user_id: userId,
        date,
        start_time: g.start,
        end_time: g.end,
      })),
    );

    const { error } = await supabaseBrowser()
      .from('availabilities')
      .upsert(payload, {
        onConflict: 'user_id,date,start_time,end_time',
        ignoreDuplicates: true,
      });

    setBusy(false);
    if (error) return setErr(`建立失敗：${error.message}`);
    dismiss();
    onDone();
  }

  return (
    <section className="card border-brand-200 bg-brand-50/60 p-5">
      <h2 className="font-black">要把計算機那張表填進來嗎？</h2>
      <p className="mt-1 text-sm text-ink-soft">
        會建立未來 {WEEKS} 週、共 {total} 個時段。之後都可以單獨刪掉。
      </p>

      <ul className="mt-3 space-y-1">
        {draft.groups.map((g) => (
          <li key={`${g.start}-${g.end}`} className="text-sm font-semibold">
            每週
            {g.weekdays.map((w) => WEEK[toJsDay(w)]).join('、')}
            <span className="ml-2 font-normal text-ink-soft">
              {g.start}–{g.end}
            </span>
          </li>
        ))}
      </ul>

      {err && <p className="mt-2 text-sm font-semibold text-brand-700">{err}</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={apply} disabled={busy} className="btn-primary">
          {busy ? '建立中…' : '幫我填好'}
        </button>
        <button type="button" onClick={dismiss} className="btn-ghost btn-soft">
          我自己來
        </button>
      </div>
    </section>
  );
}
