'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loading } from '@/components/NeedsSetup';
import { DuckMark } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type State = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * 從信裡點進來時，Supabase 可能用兩種方式帶憑證回來：
   *   PKCE   → ?code=...     要自己換成 session
   *   implicit → #access_token=...  supabase-js 會自動處理
   * 兩種都接，才不會因為專案設定不同就壞掉。
   */
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState('invalid');
      setErr('尚未連上資料庫');
      return;
    }

    const sb = supabaseBrowser();
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const errorDesc =
      url.searchParams.get('error_description') ??
      new URLSearchParams(url.hash.replace(/^#/, '')).get('error_description');

    (async () => {
      if (errorDesc) {
        setState('invalid');
        setErr(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        return;
      }

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

    // implicit flow 是非同步解析 hash 的，等它派事件出來
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) setState('ready');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr('兩次輸入的密碼不一樣');
      return;
    }
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().auth.updateUser({ password });

    setBusy(false);
    if (error) {
      setErr(
        /should be different|same as/i.test(error.message)
          ? '新密碼不能跟舊的一樣'
          : error.message,
      );
      return;
    }
    setState('done');
  }

  if (state === 'checking') return <Loading rows={2} />;

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <DuckMark size={52} />
        <h1 className="mt-4 text-2xl font-black tracking-tight">
          {state === 'done' ? '密碼已更新' : '設定新密碼'}
        </h1>
      </div>

      {state === 'invalid' && (
        <div className="card space-y-3 p-5 text-center">
          <span className="text-4xl">⌛</span>
          <p className="font-bold">這條連結沒辦法用</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            重設連結可能已經過期、已經用過，或是換了瀏覽器開啟。
          </p>
          {err && <p className="text-xs text-ink-muted">（{err}）</p>}
          <Link href="/forgot-password" className="btn-primary w-full">
            重新寄一次
          </Link>
        </div>
      )}

      {state === 'done' && (
        <div className="card space-y-3 p-5 text-center">
          <span className="text-4xl">🦆</span>
          <p className="text-sm leading-relaxed text-ink-soft">
            新密碼已經生效，你現在是登入狀態。
          </p>
          <button
            onClick={() => {
              router.push('/me');
              router.refresh();
            }}
            className="btn-primary w-full"
          >
            進入鴨窩
          </button>
        </div>
      )}

      {state === 'ready' && (
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
      )}
    </div>
  );
}
