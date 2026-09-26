import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { Filters, type FilterValues } from '@/components/Filters';
import { JobCard, type JobWithEmployer } from '@/components/JobCard';
import { DEMO_JOBS } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { clampDescription } from '@/lib/seo';
import { utcNowNaive } from '@/lib/types';

export const metadata: Metadata = {
  title: '短期工作與零工機會',
  description: clampDescription(
    '看看有誰正在找人：短期工作、單次零工、活動幫手。時間、地點、報酬都寫清楚，直接應徵。',
  ),
  alternates: { canonical: '/jobs' },
};

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

function one(sp: SP, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f: FilterValues = {
    date: one(sp, 'date'),
    start: one(sp, 'start'),
    end: one(sp, 'end'),
    category: one(sp, 'category'),
    city: one(sp, 'city'),
    district: one(sp, 'district'),
  };

  let jobs: JobWithEmployer[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await supabaseServer();
    let q = supabase
      .from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(display_name)')
      .eq('status', 'open')
      .gt('ends_at_utc', utcNowNaive())
      .order('date')
      .order('start_time')
      .limit(60);

    if (f.date) q = q.eq('date', f.date);
    if (f.start) q = q.gte('start_time', f.start);
    if (f.end) q = q.lte('end_time', f.end);
    if (f.category) q = q.eq('category_id', f.category);
    if (f.city) q = q.eq('city', f.city);
    if (f.district) q = q.eq('district', f.district);

    const { data, error: err } = await q;
    if (err) error = err.message;
    jobs = ((data ?? []) as unknown as (JobWithEmployer & { employer?: { display_name: string } })[]).map(
      (j) => ({ ...j, employer_name: j.employer?.display_name ?? '匿名雇主' }),
    );
  } else {
    jobs = DEMO_JOBS.filter((j) => {
      if (f.date && j.date !== f.date) return false;
      if (f.start && j.start_time.slice(0, 5) < f.start) return false;
      if (f.end && j.end_time.slice(0, 5) > f.end) return false;
      if (f.category && j.category_id !== f.category) return false;
      if (f.city && j.city !== f.city) return false;
      if (f.district && j.district !== f.district) return false;
      return true;
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">有人在找幫手</h1>
          <p className="mt-1 text-sm text-ink-soft">
            這些是雇主主動貼出來的工作。也別忘了
            <Link href="/me/availability" className="font-semibold text-brand-600 underline underline-offset-2">
              擺出你的空檔
            </Link>
            讓人來找你。
          </p>
        </div>
        <Link href="/jobs/quick" className="btn-ghost hidden shrink-0 sm:inline-flex">
          發布工作
        </Link>
      </header>

      <Filters initial={f} basePath="/jobs" />

      {error && (
        <div className="card border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          載入失敗：{error}
        </div>
      )}

      {jobs.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-ink-soft">{jobs.length} 個工作機會</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((j, i) => (
              <JobCard key={j.id} job={j} index={i} />
            ))}
          </div>
        </>
      ) : (
        !error && (
          <EmptyState
            emoji="📭"
            title="這個條件下沒有工作"
            body="換個日期或分類看看，或是直接擺出你的空檔讓雇主來找你。"
            actionHref="/me/availability"
            actionLabel="擺出我的空檔"
          />
        )
      )}
    </div>
  );
}
