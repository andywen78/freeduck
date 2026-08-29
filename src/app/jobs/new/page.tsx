'use client';

import Link from 'next/link';
import { JobForm } from '@/components/JobForm';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { useUser } from '@/lib/useUser';

export default function NewJobPage() {
  const { userId, loading, unconfigured } = useUser();

  if (unconfigured) return <NeedsSetup />;
  if (loading) return <Loading rows={2} />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">發布工作需要先登入</p>
        <Link href="/login?next=/jobs/new" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href="/jobs" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 工作列表
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">發布一個工作</h1>
        <p className="mt-1 text-sm text-ink-soft">
          攤販、家長、個人都可以發 —— 不需要公司登記。
        </p>
      </header>

      <JobForm userId={userId} />
    </div>
  );
}
