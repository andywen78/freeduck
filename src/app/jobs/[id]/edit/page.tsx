'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { JobForm, draftFromJob, type JobDraft } from '@/components/JobForm';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import type { Job } from '@/lib/types';

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userId, loading, unconfigured } = useUser();

  const [draft, setDraft] = useState<JobDraft | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from('jobs').select('*').eq('id', id).maybeSingle();
    if (data) {
      const j = data as Job;
      setOwnerId(j.employer_id);
      setDraft(draftFromJob(j));
    }
    setFetching(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading rows={3} />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href={`/login?next=/jobs/${id}/edit`} className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );
  if (!draft) return <p className="card p-8 text-center text-sm text-ink-soft">找不到這個工作</p>;
  if (ownerId !== userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">這不是你發布的工作</p>
        <Link href={`/jobs/${id}`} className="btn-ghost mt-4">
          回工作頁
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link
          href="/me/jobs"
          className="text-sm font-semibold text-ink-muted hover:text-brand-600"
        >
          ← 我發布的工作
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">編輯工作</h1>
        <p className="mt-1 text-sm text-ink-soft">
          已經應徵的人不會收到變更通知，改動較大時建議在訊息裡跟他們說一聲。
        </p>
      </header>

      <JobForm userId={userId} jobId={id} initial={draft} />
    </div>
  );
}
