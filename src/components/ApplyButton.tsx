'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';

export function ApplyButton({
  jobId,
  employerId,
  jobTitle,
}: {
  jobId: string;
  employerId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const { userId, unconfigured } = useUser();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || unconfigured) return;
    supabaseBrowser()
      .from('applications')
      .select('status')
      .eq('job_id', jobId)
      .eq('worker_id', userId)
      .maybeSingle()
      .then(({ data }) => setStatus(data?.status ?? null));
  }, [userId, jobId, unconfigured]);

  async function apply() {
    if (!userId) return;
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().from('applications').insert({
      job_id: jobId,
      worker_id: userId,
      message: message.trim() || null,
    });

    setBusy(false);
    if (error) {
      setErr(error.code === '23505' ? '你已經應徵過這個工作了' : `送出失敗：${error.message}`);
      return;
    }
    setStatus('pending');
    setOpen(false);
    router.refresh();
  }

  if (unconfigured) {
    return (
      <button className="btn-primary w-full !py-3" disabled>
        示範模式無法應徵
      </button>
    );
  }

  if (!userId) {
    return (
      <Link href={`/login?next=/jobs/${jobId}`} className="btn-primary w-full !py-3">
        登入後應徵
      </Link>
    );
  }

  if (userId === employerId) {
    return (
      <div className="flex gap-2">
        <Link href={`/jobs/${jobId}/edit`} className="btn-ghost flex-1 !py-3">
          編輯
        </Link>
        <Link href="/me/jobs" className="btn-primary flex-1 !py-3">
          管理與應徵者
        </Link>
      </div>
    );
  }

  if (status) {
    const label =
      status === 'pending' ? '已送出，等雇主回覆' : status === 'accepted' ? '雇主已錄取你 🎉' : '雇主未錄取';
    return (
      <div
        className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
          status === 'accepted' ? 'bg-ok-bg text-ok' : 'bg-cream text-ink-soft'
        }`}
      >
        {label}
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full !py-3 text-base">
        我要應徵
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="應徵這份工作"
        subtitle={jobTitle}
      >
        <div className="space-y-4">
          <div>
            <label className="label">跟雇主說幾句（選填）</label>
            <textarea
              rows={3}
              className="field resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`我對「${jobTitle}」有興趣，那個時段我剛好有空。`}
              maxLength={300}
            />
          </div>

          {err && (
            <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>
          )}

          <p className="text-xs leading-relaxed text-ink-muted">
            🔒 聯絡方式不會自動交換。雇主錄取後，你們可以在聊天室裡互相請求聯絡方式。
          </p>

          <div className="flex gap-2 pt-1">
            <button onClick={apply} disabled={busy} className="btn-primary flex-1">
              {busy ? '送出中…' : '送出應徵'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost">
              取消
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
