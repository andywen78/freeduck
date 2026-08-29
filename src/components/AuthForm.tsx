'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DuckMark } from './Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/me';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);

  const isSignup = mode === 'signup';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setMsg({ kind: 'err', text: '尚未連上資料庫，請先在 .env.local 填入 Supabase 金鑰。' });
      return;
    }
    setBusy(true);
    setMsg(null);

    const supabase = supabaseBrowser();
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: 'ok', text: '註冊成功！請到信箱點開確認信後再回來登入。' });
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : '發生未知錯誤';
      setMsg({
        kind: 'err',
        text:
          text === 'Invalid login credentials'
            ? '帳號或密碼不對'
            : text === 'User already registered'
              ? '這個 Email 已經註冊過了，直接登入吧'
              : text,
      });
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <DuckMark size={52} />
        <h1 className="mt-4 text-2xl font-black tracking-tight">
          {isSignup ? '加入有空鴨' : '歡迎回來'}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {isSignup ? '30 秒註冊，開始擺你的空檔' : '登入後管理你的時段與邀約'}
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        {isSignup && (
          <div>
            <label className="label" htmlFor="name">
              顯示名稱
            </label>
            <input
              id="name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="小雲"
              required
              maxLength={30}
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            Email
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

        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="pw">
              密碼
            </label>
            {!isSignup && (
              <Link
                href="/forgot-password"
                className="mb-1.5 text-xs font-semibold text-ink-muted hover:text-brand-600"
              >
                忘記密碼？
              </Link>
            )}
          </div>
          <input
            id="pw"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? '至少 6 個字' : ''}
            minLength={6}
            required
          />
        </div>

        {msg && (
          <p
            className={`rounded-xl px-3 py-2.5 text-sm ${
              msg.kind === 'err'
                ? 'bg-brand-50 text-brand-800'
                : 'bg-ok-bg text-ok'
            }`}
          >
            {msg.text}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
          {busy ? '處理中…' : isSignup ? '建立帳號' : '登入'}
        </button>

        {isSignup && (
          <p className="text-center text-xs leading-relaxed text-ink-muted">
            建立帳號即表示你已閱讀並同意{' '}
            <Link href="/terms" className="font-semibold text-brand-600 underline underline-offset-2">
              使用條款
            </Link>{' '}
            與{' '}
            <Link href="/privacy" className="font-semibold text-brand-600 underline underline-offset-2">
              隱私權政策
            </Link>
            。未滿 18 歲須經法定代理人同意。
          </p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {isSignup ? '已經有帳號了？' : '還沒有帳號？'}{' '}
        <Link
          href={isSignup ? '/login' : '/signup'}
          className="font-semibold text-brand-600 underline underline-offset-2"
        >
          {isSignup ? '登入' : '免費註冊'}
        </Link>
      </p>
    </div>
  );
}
