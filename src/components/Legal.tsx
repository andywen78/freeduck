import Link from 'next/link';

/** 隱私權政策與使用條款共用的版型。 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-8">
        <Link href="/" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 回首頁
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">最後更新：{updated}</p>
      </header>

      <div className="space-y-7 text-[15px] leading-relaxed text-ink-soft">{children}</div>

      <p className="mt-12 rounded-2xl bg-cream px-5 py-4 text-xs leading-relaxed text-ink-muted">
        本文件為平台自行擬定，非法律意見。若你對條款內容有疑義，建議諮詢律師。
      </p>
    </article>
  );
}

export function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 font-bold text-ink">
        <span className="text-brand-500">{n}</span>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** 每一頁都要出現的頁尾。 */
export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pb-28 pt-10 md:pb-10">
      <div className="border-t border-line pt-6 text-center text-xs leading-relaxed text-ink-muted">
        <p>
          <Link href="/terms" className="font-semibold hover:text-brand-600">
            使用條款
          </Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="font-semibold hover:text-brand-600">
            隱私權政策
          </Link>
        </p>
        <p className="mt-2">
          有空鴨 FreeDuck ｜ 本平台僅提供資訊媒合，不經手薪資、不涉人力仲介。
          <br />
          薪資由雙方自行議定與給付，請留意人身安全與勞健保權益。
        </p>
      </div>
    </footer>
  );
}
