'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DuckMark } from '@/components/Logo';
import { Loading } from '@/components/NeedsSetup';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type State = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * 設定新密碼。
 *
 * ⚠ token 只在使用者按下「更新密碼」時才消耗。
 * Brevo 的追蹤網址與信箱掃毒會預先開啟連結，如果在頁面載入時就驗證，
 * 一次性 token 會被機器用掉，使用者真的點進來時就失效了。
 */
function Reset() {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash');
  const code = params.get('code');

  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState('invalid');
      setErr('尚未連上資料庫');
      return;
    }

    // token_hash 流程：先不驗證，等使用者送出表單再說
    if (tokenHash) {
      setState('ready');
      return;
    }

    const sb = supabaseBrowser();

    (async () => {
      // 舊的 PKCE 連結（?code=）仍然接，但這種會被爬蟲先消耗掉
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          setState('invalid');
          setErr(error.message);
          return;
        }
      }
      const { data } = await sb.auth.getSession();
      setState(data.session ? 'ready' : 'invalid');
    })();

    // implicit 流程是非同步解析網址 hash 的，等事件
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) setState('ready');
    });
    return () => sub.subscription.unsubscribe();
  }, [tokenHash, code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr('兩次輸入的密碼不一樣');
      return;
    }
    setBusy(true);
    setErr(null);

    const sb = supabaseBrowser();

    // 到這一刻才動用 token
    if (tokenHash) {
      const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
      if (error) {
        setBusy(false);
        setErr(
          /expired|invalid/i.test(error.message)
            ? '這條重設連結已經過期或用過了，請重新申請一次。'
            : error.message,
        );
        return;
      }
    }

    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(/should be different|same as/i.test(error.message) ? '新密碼不能跟舊的一樣' : error.message);
      return;
    }
    setState('done');
  }

  if (state === 'checking') return <Loading rows={2} />;

  if (state === 'invalid') {
    return (
      <div className="card space-y-3 p-5 text-center">
        <span className="text-4xl">⌛</span>
        <p className="font-bold">這條連結沒辦法用</p>
        <p className="text-sm leading-relaxed text-ink-soft">
          重設連結可能已經過期或用過了。
        </p>
        {err && <p className="text-xs text-ink-muted">（{err}）</p>}
        <Link href="/forgot-password" className="btn-primary w-full">
          重新寄一次
        </Link>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="card space-y-3 p-5 text-center">
        <span className="text-4xl">🦆</span>
        <p className="text-sm leading-relaxed text-ink-soft">新密碼已經生效，你現在是登入狀態。</p>
        <button onClick={() => window.location.assign('/me')} className="btn-primary w-full">
          進入鴨窩
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="pw">
          新密碼
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 6 個字"
          minLength={6}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="pw2">
          再輸入一次
        </label>
        <input
          id="pw2"
          type="password"
          autoComplete="new-password"
          className="field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          required
        />
      </div>

      {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
        {busy ? '更新中…' : '更新密碼'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <DuckMark size={52} />
        <h1 className="mt-4 text-2xl font-black tracking-tight">設定新密碼</h1>
      </div>
      <Suspense fallback={<Loading rows={2} />}>
        <Reset />
      </Suspense>
    </div>
  );
}
