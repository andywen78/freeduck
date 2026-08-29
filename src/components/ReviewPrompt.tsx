'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { useNotifications } from './Notifications';
import { StarInput } from './StarInput';
import { supabaseBrowser } from '@/lib/supabase/client';
import { formatDate, hhmm } from '@/lib/types';

type Pending = {
  kind: 'invite' | 'application';
  engagement_id: string;
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar: string | null;
  label: string | null;
  happened_on: string;
  end_time: string;
};

/**
 * 「待評價」區塊。時段結束後由 pending_reviews() 自動長出來，
 * 不需要任何人按「已完成」。
 */
export function ReviewPrompt({ userId }: { userId: string }) {
  const { refresh: refreshBadges } = useNotifications();

  const [rows, setRows] = useState<Pending[]>([]);
  const [target, setTarget] = useState<Pending | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().rpc('pending_reviews');
    setRows((data as Pending[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function open(p: Pending) {
    setTarget(p);
    setRating(0);
    setComment('');
    setErr(null);
  }

  async function submit() {
    if (!target || !rating) {
      setErr('請先點星星');
      return;
    }
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().from('reviews').insert({
      rater_id: userId,
      ratee_id: target.counterparty_id,
      rating,
      comment: comment.trim() || null,
      invite_id: target.kind === 'invite' ? target.engagement_id : null,
      application_id: target.kind === 'application' ? target.engagement_id : null,
    });

    setBusy(false);
    if (error) {
      setErr(
        error.code === '23505'
          ? '你已經評過這一筆了'
          : /row-level security/i.test(error.message)
            ? '這一筆還不能評價（要等工作時段結束）'
            : error.message,
      );
      return;
    }

    setRows((r) => r.filter((x) => x.engagement_id !== target.engagement_id));
    setTarget(null);
    refreshBadges();
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-bold">
        待評價
        <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
          {rows.length}
        </span>
      </h2>
      <p className="-mt-1 text-sm text-ink-soft">
        工作時段已經結束了。互相評價能讓之後找你的人更放心。
      </p>

      {rows.map((p) => (
        <div key={p.engagement_id} className="card animate-rise flex items-center gap-3 p-4">
          <Avatar
            name={p.counterparty_name}
            seed={p.counterparty_id}
            url={p.counterparty_avatar}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{p.counterparty_name}</p>
            <p className="truncate text-sm text-ink-soft">
              {p.label || (p.kind === 'invite' ? '委託' : '工作')}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatDate(p.happened_on)} 至 {hhmm(p.end_time)}
            </p>
          </div>
          <button onClick={() => open(p)} className="btn-primary shrink-0 !px-4">
            去評價
          </button>
        </div>
      ))}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`評價 ${target?.counterparty_name ?? ''}`}
        subtitle={
          target ? `${formatDate(target.happened_on)} · ${target.label || '這次合作'}` : undefined
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label">這次合作如何？</label>
            <StarInput value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="label">留幾句話（選填）</label>
            <textarea
              rows={4}
              className="field resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="準時、細心，狗狗很喜歡他。下次還會找。"
              maxLength={300}
            />
            <p className="mt-1 text-right text-xs text-ink-muted">{comment.length}/300</p>
          </div>

          {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

          <p className="text-xs leading-relaxed text-ink-muted">
            評價會公開顯示在對方的個人頁面，並計入他的平均星等。
          </p>

          <p className="rounded-xl bg-warn-bg px-3 py-2.5 text-xs leading-relaxed text-warn">
            送出後不能修改也不能刪除，請先確認星數。
          </p>

          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-primary flex-1">
              {busy ? '送出中…' : '送出評價'}
            </button>
            <button onClick={() => setTarget(null)} className="btn-ghost">
              晚點再說
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
