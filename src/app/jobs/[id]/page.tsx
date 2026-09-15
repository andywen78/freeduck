import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApplyButton } from '@/components/ApplyButton';
import { Avatar } from '@/components/Avatar';
import type { JobWithEmployer } from '@/components/JobCard';
import { categoryOf } from '@/lib/categories';
import { DEMO_JOBS } from '@/lib/demo';
import { clampDescription, pageTitle } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';
import { supabaseServer } from '@/lib/supabase/server';
import { formatDate, formatRate, hhmm } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let job: Pick<JobWithEmployer, 'title' | 'description' | 'city' | 'district' | 'date' | 'rate' | 'rate_unit' | 'category_id'> | null = null;

  if (isSupabaseConfigured) {
    const supabase = supabaseAnon();
    const { data } = await supabase
      .from('jobs')
      .select('title, description, city, district, date, rate, rate_unit, category_id')
      .eq('id', id)
      .maybeSingle();
    job = data as typeof job;
  } else {
    job = DEMO_JOBS.find((j) => j.id === id) ?? null;
  }

  if (!job) return { title: '找不到這筆工作', robots: { index: false, follow: false } };

  const where = `${job.city}${job.district}`;
  const title = `${job.title} · ${where} ${formatRate(job.rate, job.rate_unit)}`;

  return {
    title,
    description: clampDescription(
      job.description?.trim() ||
        `${where}徵${categoryOf(job.category_id)?.name ?? '幫手'}，${formatDate(job.date)}，${formatRate(job.rate, job.rate_unit)}。`,
    ),
    alternates: { canonical: `/jobs/${id}` },
    openGraph: { type: 'article', url: `/jobs/${id}`, title: pageTitle(title) },
  };
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let job: JobWithEmployer | null;

  if (isSupabaseConfigured) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(display_name)')
      .eq('id', id)
      .maybeSingle();

    const row = data as (JobWithEmployer & { employer?: { display_name: string } }) | null;
    job = row ? { ...row, employer_name: row.employer?.display_name ?? '匿名雇主' } : null;
  } else {
    job = DEMO_JOBS.find((j) => j.id === id) ?? null;
  }

  if (!job) notFound();
  const c = categoryOf(job.category_id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/jobs" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
        ← 工作列表
      </Link>

      <article className="card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl">
            {c?.emoji ?? '•'}
          </span>
          <div className="min-w-0 flex-1">
            <span className="chip">{c?.name ?? '其他'}</span>
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight">{job.title}</h1>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ink-muted">時間</dt>
            <dd className="mt-0.5 font-bold text-brand-700">
              {formatDate(job.date)} {hhmm(job.start_time)}–{hhmm(job.end_time)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">薪資</dt>
            <dd className="mt-0.5 text-lg font-black text-brand-600">
              {formatRate(job.rate, job.rate_unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">地點</dt>
            <dd className="mt-0.5 font-semibold">
              {job.city} {job.district}
              {job.address_note && (
                <span className="ml-1 font-normal text-ink-soft">· {job.address_note}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">需求人數</dt>
            <dd className="mt-0.5 font-semibold">{job.headcount} 人</dd>
          </div>
        </dl>

        {job.description && (
          <div className="mt-6 border-t border-line pt-5">
            <h2 className="text-sm font-bold">工作內容</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {job.description}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
          <Avatar name={job.employer_name} seed={job.employer_id} size={40} />
          <div>
            <p className="text-xs text-ink-muted">發布者</p>
            <p className="font-bold">{job.employer_name}</p>
          </div>
        </div>
      </article>

      <div className="sticky bottom-20 md:bottom-6">
        <ApplyButton jobId={job.id} employerId={job.employer_id} jobTitle={job.title} />
      </div>

      <p className="pb-2 text-center text-xs leading-relaxed text-ink-muted">
        平台僅提供資訊媒合，不經手薪資。請自行確認工作內容與人身安全。
      </p>
    </div>
  );
}
