'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export type Reply = { body: string; created_at: string };

/**
 * 被評價的人對單則評價的公開回應。
 *
 * 為什麼是「回應」而不是「刪除」：評價本體從 0006 起就不可變更，這是產品
 * 決定。但被評的人完全沒有話語權也不對 —— 遇到主觀或不實的評價，回應比
 * 刪除更合理，也不需要平台當裁判。
 *
 * 回應同樣送出即定案（review_replies 沒有 update / delete 政策），
 * 而且一則評價只能回一次（review_id 是 primary key）。
 */
export function ReviewReply({
  reviewId,
  existing,
  canReplyAs,
}: {
  reviewId: string;
  existing: Reply | null;
  canReplyAs: string | null;
}) {
  const [saved, setSaved] = useState<Reply | null>(existing);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (saved) {
    return (
      <div className="mt-3 rounded-lg border-l-2 border-brand-300 bg-cream px-3 py-2">
        <p className="text-xs font-bold text-ink-soft">本人回應</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {saved.body}
        </p>
      </div>
    );
  }

  if (!canReplyAs) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        回應這則評價
      </button>
    );
  }

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb
      .from('review_replies')
      .insert({ review_id: reviewId, author_id: canReplyAs, body: text });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved({ body: text, created_at: new Date().toISOString() });
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        className="field min-h-20"
        placeholder="說明你的立場。送出後不能修改，也只能回應一次。"
        value={body}
        maxLength={500}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-primary !px-4 !py-1.5 !text-sm"
          disabled={busy || !body.trim()}
          onClick={submit}
        >
          {busy ? '送出中…' : '送出回應'}
        </button>
        <button
          type="button"
          className="text-xs text-ink-muted underline underline-offset-2"
          onClick={() => setOpen(false)}
        >
          取消
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
