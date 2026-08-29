'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { Tabs } from '@/components/Tabs';
import { categoryOf } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatDate, formatRate, hhmm, utcNowNaive, type Job } from '@/lib/types';

type Row = Job & { ends_at_utc?: string; applicants: number; pending: number };

const STATUS_LABEL: Record<Job['status'], string> = {
  open: '徵人中',
  filled: '已徵滿',
  closed: '已關閉',
};

const STATUS_TONE: Record<Job['status'], string> = {
  open: 'bg-ok-bg text-ok',
  filled: 'bg-warn-bg text-warn',
  closed: 'bg-line text-ink-muted',
};

export default function MyJobsPage() {
  const { userId, loading, unconfigured } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const sb = supabaseBrowser();

    const { data: jobs } = await sb
      .from('jobs')
      .select('*')
      .eq('employer_id', userId)
      .order('date', { ascending: false });

    const list = (jobs as Job[]) ?? [];

    // RLS 只讓我看到自己工作的應徵。一則工作都沒有就別發這個查詢
    // （空陣列會被塞成無效 uuid，Postgres 會直接報錯）
    const apps = list.length
      ? (
          await sb
            .from('applications')
            .select('job_id, status')
            .in(
              'job_id',
              list.map((j) => j.id),
            )
        ).data
      : [];

    const byJob = new Map<string, { total: number; pending: number }>();
    for (const a of (apps as { job_id: string; status: string }[]) ?? []) {
      const cur = byJob.get(a.job_id) ?? { total: 0, pending: 0 };
      cur.total++;
      if (a.status === 'pending') cur.pending++;
      byJob.set(a.job_id, cur);
    }

    setRows(
      list.map((j) => ({
        ...j,
        applicants: byJob.get(j.id)?.total ?? 0,
        pending: byJob.get(j.id)?.pending ?? 0,
      })),
    );
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else if (!loading) setFetching(false);
  }, [userId, loading, load]);

  async function setStatus(id: string, status: Job['status']) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabaseBrowser().from('jobs').update({ status }).eq('id', id);
  }

  async function remove(id: string) {
    if (!confirm('刪除後應徵紀錄也會一起消失，確定嗎？')) return;
    setRows((r) => r.filter((x) => x.id !== id));
    await supabaseBrowser().from('jobs').delete().eq('id', id);
  }

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/me/jobs" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  const now = utcNowNaive();

  /**
   * 「刊登中」= 還可能有人來應徵：狀態不是已關閉，而且時間還沒過。
   * 「已結束」= 徵滿、關閉、或時間已經過去的。
   */
  const isLive = (j: Row) =>
    j.status !== 'closed' && !(j.ends_at_utc && j.ends_at_utc < now) && j.status !== 'filled';
  const live = rows.filter(isLive);
  const done = rows.filter((j) => !isLive(j));
  const shown = tab === 'active' ? live : done;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/me" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
            ← 鴨窩
          </Link>
          <h1 className="mt-2 text-2xl font-black tracking-tight">我發布的工作</h1>
          <p className="mt-1 text-sm text-ink-soft">
            徵到人了就標「已徵滿」，它會從搜尋結果消失。
          </p>
        </div>
        <Link href="/jobs/new" className="btn-primary shrink-0 !px-4">
          發布
        </Link>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'active', label: '刊登中', count: live.length },
          { key: 'past', label: '已結束', count: done.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          emoji="📣"
          title="還沒發布過工作"
          body="攤販、家長、個人都可以發，不需要公司登記。"
          actionHref="/jobs/new"
          actionLabel="發布第一個工作"
        />
      ) : shown.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-ink-soft">
          {tab === 'active'
            ? '沒有刊登中的工作。徵滿、關閉、或時間過了的都在「已結束」。'
            : '還沒有結束的工作。'}
        </div>
      ) : (
        shown.map((j, i) => {
          const c = categoryOf(j.category_id);
          const ended = !!j.ends_at_utc && j.ends_at_utc < now;

          return (
            <div
              key={j.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className={`card animate-rise p-4 ${j.status === 'closed' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
                  {c?.emoji ?? '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${j.id}`} className="font-bold hover:text-brand-600">
                    {j.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {formatDate(j.date)} {hhmm(j.start_time)}–{hhmm(j.end_time)} · {j.city}
                    {j.district}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`chip !border-0 ${STATUS_TONE[j.status]}`}>
                    {STATUS_LABEL[j.status]}
                  </span>
                  {ended && <span className="chip !bg-line !text-ink-muted">時間已過</span>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <span className="text-sm font-semibold">
                  {formatRate(j.rate, j.rate_unit)}
                  <span className="ml-2 font-normal text-ink-muted">徵 {j.headcount} 人</span>
                </span>

                <Link
                  href="/me"
                  className={`chip ${
                    j.pending ? '!border-brand-300 !bg-brand-50 !text-brand-700' : ''
                  }`}
                >
                  {j.applicants} 人應徵
                  {j.pending > 0 && ` · ${j.pending} 待處理`}
                </Link>

                <div className="ml-auto flex flex-wrap gap-2">
                  <Link href={`/jobs/${j.id}/edit`} className="btn-ghost !px-3 !py-1.5 text-xs">
                    編輯
                  </Link>

                  {j.status === 'open' && (
                    <button
                      onClick={() => setStatus(j.id, 'filled')}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      標記已徵滿
                    </button>
                  )}
                  {j.status !== 'open' && (
                    <button
                      onClick={() => setStatus(j.id, 'open')}
                      className="btn-soft !px-3 !py-1.5 text-xs"
                    >
                      重新開放
                    </button>
                  )}
                  {j.status !== 'closed' && (
                    <button
                      onClick={() => setStatus(j.id, 'closed')}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      關閉
                    </button>
                  )}
                  <button
                    onClick={() => remove(j.id)}
                    className="px-2 text-xs font-semibold text-ink-muted hover:text-brand-600"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
