import { DuckAvatar } from './DuckAvatar';

export function Avatar({
  name,
  seed,
  url,
  size = 48,
}: {
  name: string;
  seed?: string;
  url?: string | null;
  size?: number;
}) {
  // 有上傳大頭照就用照片，沒有就給他一隻專屬的鴨
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return <DuckAvatar seed={seed ?? name} size={size} />;
}

export function Stars({ avg, count }: { avg: number; count: number }) {
  if (!count) {
    return <span className="text-xs text-ink-muted">尚無評價</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
      <span className="text-duck-500">★</span>
      {Number(avg).toFixed(1)}
      <span className="font-normal text-ink-muted">({count})</span>
    </span>
  );
}
