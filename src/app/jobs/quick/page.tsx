'use client';

import Link from 'next/link';
import { QuickJobForm } from '@/components/QuickJobForm';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { useUser } from '@/lib/useUser';

export default function QuickJobPage() {
  const { userId, loading, unconfigured } = useUser();

  if (unconfigured) return <NeedsSetup />;
  if (loading) return <Loading rows={2} />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">發需求需要先登入，免費而且只要 email</p>
        <Link href="/signup?next=/jobs/quick" className="btn-primary mt-4">
          註冊 / 登入
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-16">
      <header>
        <Link href="/jobs" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 工作列表
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">30 秒說你要找什麼人</h1>
        <p className="mt-1 text-sm text-ink-soft">
          三個問題就好。攤販、家長、個人都可以發，不需要公司登記。
        </p>
      </header>

      <QuickJobForm userId={userId} />
    </div>
  );
}
