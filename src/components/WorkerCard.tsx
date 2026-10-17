import Link from 'next/link';
import { Avatar, Stars } from './Avatar';
import { NOTE_BG, Note, type NoteColor } from './Note';
import { categoryOf } from '@/lib/categories';
import { formatDate, formatRate, hhmm, type WorkerHit } from '@/lib/types';

const TILTS = [-1.2, 0.9, -0.6, 1.3];

export function WorkerCard({
  hit,
  index = 0,
  color = 'yellow',
}: {
  hit: WorkerHit;
  index?: number;
  color?: NoteColor;
}) {
  const services = hit.services ?? [];

  return (
    <Note
      tilt={TILTS[index % TILTS.length]}
      fix={index % 2 ? 'tape' : 'pin'}
      className={`${NOTE_BG[color]} flex flex-col px-5 pb-5 pt-7`}
    >
      {/* 空檔 —— 這張便條的主角 */}
      <p className="font-[family-name:var(--font-hand)] text-2xl leading-snug">
        {formatDate(hit.avail_date)}
        <br />
        {hhmm(hit.start_time)}–{hhmm(hit.end_time)} 有空！
      </p>

      <div className="mb-4">
        {/* 一人多技能，各自報價 */}
        <ul className="mt-3 space-y-1 font-[family-name:var(--font-hand)] text-lg">
          {services.slice(0, 4).map((s) => {
            const c = categoryOf(s.category_id);
            return (
              <li key={s.id} className="flex items-baseline gap-2">
                <span>{c?.name ?? '其他'}</span>
                {s.title && (
                  <span className="truncate font-[family-name:var(--font-noto)] text-xs text-ink-muted">
                    {s.title}
                  </span>
                )}
                <span className="ml-auto shrink-0 whitespace-nowrap">
                  {formatRate(s.rate, s.rate_unit)}
                </span>
              </li>
            );
          })}
          {services.length > 4 && (
            <li className="font-[family-name:var(--font-noto)] text-xs text-ink-muted">
              還有 {services.length - 4} 項服務…
            </li>
          )}
          {services.length === 0 && (
            <li className="font-[family-name:var(--font-noto)] text-xs text-ink-muted">
              尚未列出服務項目
            </li>
          )}
        </ul>

        {hit.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-soft">{hit.bio}</p>
        )}
      </div>

      {/* 署名 */}
      <footer className="mt-auto flex items-center gap-2.5 border-t border-dashed border-ink/25 pt-3">
        <Avatar name={hit.display_name} seed={hit.worker_id} url={hit.avatar_url} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-bold">{hit.display_name}</h3>
            <Stars avg={hit.rating_avg} count={hit.rating_count} />
          </div>
          <p className="text-xs text-ink-muted">
            {hit.city ?? '未填地區'}
            {hit.district ? ` · ${hit.district}` : ''}
          </p>
        </div>
      </footer>

      <Link
        href={`/worker/${hit.worker_id}?availability=${hit.availability_id}`}
        className="btn-primary mt-4 w-full"
      >
        邀約 {hit.display_name}
      </Link>
    </Note>
  );
}
