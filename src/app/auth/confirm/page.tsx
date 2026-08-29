'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DuckMark } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * 信箱驗證的落地頁。
 *
 * ⚠ 為什麼要多這一個「按鈕」而不是自動驗證：
 * Brevo 的 SMTP 交易信會把連結包成追蹤網址，而且無法關閉。追蹤器與信箱掃毒
 * 會「預先開啟」連結，一次性 token 就被機器用掉了，使用者真的點下去時已經失效。
 * 把消耗 token 的動作放在使用者的點擊之後，機器載入頁面也不會影響。
 */
function Confirm() {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash');
  const type = (params.get('type') ?? 'signup') as 'signup' | 'email_change' | 'invite';

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify() {
    if (!tokenHash || !isSupabaseConfigured) return;
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().auth.verifyOtp({ token_hash: tokenHash, type });

    if (error) {
      setBusy(false);
      setErr(
        /expired|invalid/i.test(error.message)
          ? '這條連結已經過期或用過了。如果你的信箱已經驗證過，直接登入即可。'
          : error.message,
      );
      return;
    }
    // 整頁導向，確保 cookie 隨 document 請求送出
    window.location.assign('/me');
  }

  if (!tokenHash) {
    return (
      <div className="card space-y-3 p-5 text-center">
        <span className="text-4xl">🤔</span>
        <p className="font-bold">這個網址少了驗證資訊</p>
        <p className="text-sm text-ink-soft">請從信件裡的連結進來。</p>
        <Link href="/login" className="btn-ghost w-full">
          回登入頁
        </Link>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5 text-center">
      <p className="text-sm leading-relaxed text-ink-soft">
        按下按鈕完成信箱驗證，完成後會直接登入。
      </p>

      {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

      <button onClick={verify} disabled={busy} className="btn-primary w-full !py-3 text-base">
        {busy ? '驗證中…' : '完成驗證'}
      </button>

      {err && (
        <Link href="/login" className="btn-ghost w-full">
          去登入
        </Link>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <DuckMark size={52} />
        <h1 className="mt-4 text-2xl font-black tracking-tight">驗證你的信箱</h1>
      </div>
      <Suspense
        fallback={<div className="skel h-40" />}
      >
        <Confirm />
      </Suspense>
    </div>
  );
}
