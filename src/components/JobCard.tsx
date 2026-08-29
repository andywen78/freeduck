import Link from 'next/link';
import { categoryOf } from '@/lib/categories';
import { formatDate, formatRate, hhmm, type Job } from '@/lib/types';

export type JobWithEmployer = Job & { employer_name: string };

export function JobCard({ job, index = 0 }: { job: JobWithEmployer; index?: number }) {
  const c = categoryOf(job.category_id);

  return (
    <Link
      href={`/jobs/${job.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="card card-hover animate-rise block p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
          {c?.emoji ?? '•'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">{job.title}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{job.employer_name}</p>
        </div>
        <span className="shrink-0 text-lg font-black text-brand-600">
          {formatRate(job.rate, job.rate_unit)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="chip !bg-brand-50 !text-brand-700 font-bold">
          🗓️ {formatDate(job.date)} {hhmm(job.start_time)}–{hhmm(job.end_time)}
        </span>
        <span className="chip">
          📍 {job.city} {job.district}
        </span>
        {job.headcount > 1 && <span className="chip">徵 {job.headcount} 人</span>}
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {job.description}
        </p>
      )}
    </Link>
  );
}
