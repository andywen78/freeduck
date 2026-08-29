import Link from 'next/link';

export function EmptyState({
  emoji = '🦆',
  title,
  body,
  actionHref,
  actionLabel,
}: {
  emoji?: string;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card animate-rise flex flex-col items-center px-6 py-14 text-center">
      <span className="text-5xl">{emoji}</span>
      <h3 className="mt-4 font-bold">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-6">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
