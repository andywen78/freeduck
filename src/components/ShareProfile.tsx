'use client';

import { useState } from 'react';

/**
 * 人物頁的分享區塊。
 *
 * 冷啟動期間唯一會自己長大的管道就是供給者自己把頁面貼出去 —— 他有動機
 * （想接案），我們只要讓他不必自己想文案。文案在 server 端組好傳進來，
 * 這裡只負責「送出去」這一步。
 *
 * 手機走 navigator.share（能直接跳 LINE／IG／FB），桌機沒有這個 API，
 * 就退回複製到剪貼簿。
 */
export function ShareProfile({
  url,
  text,
  owner,
}: {
  url: string;
  text: string;
  owner: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const payload = `${text}\n${url}`;

  async function share() {
    // navigator.share 在非 HTTPS 或桌機瀏覽器不存在，要先探再用
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: '有空鴨', text, url });
        return;
      } catch {
        // 使用者自己取消分享也會走到這裡，靜靜退回複製就好
      }
    }
    try {
      await navigator.clipboard.writeText(payload);
      setMsg('已複製，直接貼到社團或限動就行');
    } catch {
      setMsg('複製失敗，長按上面的文字自己複製');
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-bold">{owner ? '把你的空檔傳出去' : '分享給需要的人'}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {owner
          ? '貼到社團、限動或群組。點開的人會看到你的空檔、報價，可以直接約你。'
          : '傳給正在找人的朋友，對方點開就能看到時段跟報價。'}
      </p>

      <p className="mt-3 rounded-xl border border-line bg-cream px-3.5 py-3 text-sm whitespace-pre-line text-ink-soft">
        {payload}
      </p>

      <button type="button" onClick={share} className="btn-primary mt-3 w-full sm:w-auto">
        {owner ? '分享我的空檔' : '分享這一頁'}
      </button>

      {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
    </section>
  );
}
