import Link from 'next/link';

/** 示範模式下進到需要登入的頁面時顯示。 */
export function NeedsSetup() {
  return (
    <div className="card mx-auto max-w-md px-6 py-12 text-center">
      <span className="text-5xl">🔌</span>
      <h2 className="mt-4 font-bold">這頁需要資料庫</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        目前是示範模式。依 README 建立 Supabase 專案、跑完
        <code className="mx-1 rounded bg-cream px-1.5 py-0.5 font-mono text-xs">
          supabase/migrations
        </code>
        的兩個 SQL，再把金鑰填進
        <code className="mx-1 rounded bg-cream px-1.5 py-0.5 font-mono text-xs">.env.local</code>
        就能用了。
      </p>
      <Link href="/discover" className="btn-ghost mt-6">
        先去逛逛示範資料
      </Link>
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel h-24" />
      ))}
    </div>
  );
}
