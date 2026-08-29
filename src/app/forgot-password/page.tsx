'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DuckMark } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setErr('尚未連上資料庫');
      return;
    }
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setBusy(false);
    if (error) {
      // 寄太頻繁會被 Supabase 擋，這種要講清楚，其他錯誤不揭露細節
      setErr(
        /rate|too many|seconds/i.test(error.message)
          ? '寄太頻繁了，請等一分鐘再試。'
          : '寄送失敗，請稍後再試。',
      );
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <DuckMark size={52} />
        <h1 className="mt-4 text-2xl font-black tracking-tight">忘記密碼</h1>
        <p className="mt-1.5 text-sm text-ink-soft">我們寄一條重設連結給你</p>
      </div>

      {sent ? (
        <div className="card space-y-3 p-5 text-center">
          <span className="text-4xl">📮</span>
          <p className="font-bold">信寄出去了</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            如果 <span className="font-semibold text-ink">{email}</span> 有註冊過，
            信箱裡會收到一封重設密碼的信。連結一小時內有效。
          </p>
          <p className="rounded-xl bg-cream px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
            沒收到的話看一下垃圾郵件匣。
            <br />
            重設連結請用<span className="font-semibold text-ink">同一個瀏覽器</span>開啟。
          </p>
          <Link href="/login" className="btn-ghost w-full">
            回登入頁
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="email">
              註冊時用的 Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy ? '寄送中…' : '寄出重設連結'}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-ink-soft">
        想起來了？{' '}
        <Link href="/login" className="font-semibold text-brand-600 underline underline-offset-2">
          回去登入
        </Link>
      </p>
    </div>
  );
}
