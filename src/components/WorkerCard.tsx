import Link from 'next/link';
import { Avatar, Stars } from './Avatar';
import { categoryOf } from '@/lib/categories';
import { formatDate, formatRate, hhmm, type WorkerHit } from '@/lib/types';

export function WorkerCard({ hit, index = 0 }: { hit: WorkerHit; index?: number }) {
  const services = hit.services ?? [];

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="card card-hover animate-rise flex flex-col p-4 sm:p-5"
    >
      <header className="flex items-start gap-3">
        <Avatar name={hit.display_name} seed={hit.worker_id} url={hit.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-bold">{hit.display_name}</h3>
            <Stars avg={hit.rating_avg} count={hit.rating_count} />
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {hit.city ?? '未填地區'}
            {hit.district ? ` · ${hit.district}` : ''}
          </p>
        </div>
      </header>

      {/* 空檔 —— 這張卡片的主角 */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5">
        <span className="text-base">🗓️</span>
        <span className="text-sm font-bold text-brand-700">
          {formatDate(hit.avail_date)} {hhmm(hit.start_time)}–{hhmm(hit.end_time)}
        </span>
        <span className="ml-auto text-[11px] font-semibold text-brand-600">有空</span>
      </div>

      {/* 一人多技能，各自報價 */}
      <ul className="mt-3 space-y-1.5">
        {services.slice(0, 4).map((s) => {
          const c = categoryOf(s.category_id);
          return (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span>{c?.emoji ?? '•'}</span>
              <span className="font-medium">{c?.name ?? '其他'}</span>
              {s.title && (
                <span className="truncate text-xs text-ink-muted">{s.title}</span>
              )}
              <span className="ml-auto shrink-0 font-bold text-ink">
                {formatRate(s.rate, s.rate_unit)}
              </span>
            </li>
          );
        })}
        {services.length > 4 && (
          <li className="text-xs text-ink-muted">還有 {services.length - 4} 項服務…</li>
        )}
        {services.length === 0 && (
          <li className="text-xs text-ink-muted">尚未列出服務項目</li>
        )}
      </ul>

      {hit.bio && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-soft">{hit.bio}</p>
      )}

      <Link
        href={`/worker/${hit.worker_id}?availability=${hit.availability_id}`}
        className="btn-primary mt-4 w-full"
      >
        邀約 {hit.display_name}
      </Link>
    </article>
  );
}
