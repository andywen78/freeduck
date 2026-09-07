'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';

/**
 * 人物頁下方的安全動作：檢舉與封鎖。
 *
 * 檢舉先做成 mailto —— 服務條款裡本來就留了這個信箱，但沒有人會為了檢舉
 * 去翻條款第 101 行。放在人物頁上等於同一個管道，可用性差一個數量級。
 *
 * 封鎖是雙向的（RLS 的 is_blocked 兩邊都查），封鎖後彼此都不會出現在對方的
 * 搜尋結果，也無法送出邀約。
 */
const REPORT_TO = 'freeduck.tw@gmail.com';

export function SafetyActions({
  targetId,
  targetName,
  initialBlocked,
}: {
  targetId: string;
  targetName: string;
  initialBlocked: boolean;
}) {
  const { userId } = useUser();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (userId && userId === targetId) return null; // 自己的頁面不顯示

  const reportHref =
    `mailto:${REPORT_TO}` +
    `?subject=${encodeURIComponent(`檢舉：${targetName}`)}` +
    `&body=${encodeURIComponent(
      [
        `被檢舉的對象：${targetName}`,
        `頁面網址：https://freeduck.tw/worker/${targetId}`,
        '',
        '發生了什麼事（請盡量具體，時間、地點、對話內容都有幫助）：',
        '',
        '',
      ].join('\n'),
    )}`;

  async function toggleBlock() {
    if (!userId) {
      setMsg('請先登入才能封鎖。');
      return;
    }
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    const { error } = blocked
      ? await sb.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetId)
      : await sb.from('blocks').insert({ blocker_id: userId, blocked_id: targetId });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setBlocked(!blocked);
    setMsg(
      blocked
        ? '已解除封鎖。'
        : '已封鎖。你們不會再出現在彼此的搜尋結果，也無法互相邀約。',
    );
  }

  return (
    <section className="pb-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <a href={reportHref} className="underline underline-offset-2 hover:text-ink">
          檢舉這個帳號
        </a>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={toggleBlock}
          disabled={busy}
          className="underline underline-offset-2 hover:text-ink disabled:opacity-50"
        >
          {blocked ? '解除封鎖' : '封鎖'}
        </button>
      </div>
      {msg && <p className="mt-1.5 text-xs text-ink-soft">{msg}</p>}
    </section>
  );
}
