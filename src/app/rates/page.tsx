import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_GROUPS, categoryOf } from '@/lib/categories';
import { MIN_SAMPLES, MIN_WAGE, RATES, UNIT_LABEL, formatRange } from '@/lib/rates';
import { clampDescription } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';

export const metadata: Metadata = {
  title: '零工行情參考',
  description: clampDescription(
    '遛狗、寵物保母、到府清潔、家教、顧小孩⋯⋯這些零工在台灣大概收多少？整理公開來源的價格區間，附上出處，並標明哪些有法定最低工資當底線。',
  ),
  alternates: { canonical: '/rates' },
  openGraph: {
    type: 'website',
    url: '/rates',
    title: '零工行情參考｜有空鴨',
    description: '遛狗、到府清潔、家教⋯⋯大概收多少？公開來源的價格區間整理。',
  },
};

/** 每小時重算就夠 —— 行情不會分秒變動 */
export const revalidate = 3600;

type Sample = { category_id: string; rate: number | null; rate_unit: string };

/** 站上某個分類的真實報價中位數。樣本不夠就回 null，寧可不講也不要講不準的數字 */
function median(values: number[]): number | null {
  if (values.length < MIN_SAMPLES) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

async function platformRates(): Promise<Map<string, { median: number; n: number }>> {
  const out = new Map<string, { median: number; n: number }>();
  if (!isSupabaseConfigured) return out;

  try {
    const { data } = await supabaseAnon()
      .from('services')
      .select('category_id, rate, rate_unit')
      .eq('is_active', true)
      .not('rate', 'is', null)
      .neq('rate_unit', 'negotiable')
      .limit(5000);

    const byCategory = new Map<string, number[]>();
    for (const s of (data ?? []) as Sample[]) {
      if (s.rate == null) continue;
      const list = byCategory.get(s.category_id) ?? [];
      list.push(s.rate);
      byCategory.set(s.category_id, list);
    }

    byCategory.forEach((values, category) => {
      const m = median(values);
      if (m != null) out.set(category, { median: m, n: values.length });
    });
  } catch {
    // 查不到就整頁退回參考值，不要讓行情頁整個掛掉
  }
  return out;
}

export default async function Page() {
  const live = await platformRates();
  const groups = CATEGORY_GROUPS.map((g) => ({
    name: g,
    rows: RATES.filter((r) => categoryOf(r.category)?.group === g),
  })).filter((g) => g.rows.length);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header>
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          零工行情參考
        </h1>
        <p className="mt-3 text-ink-soft">
          這些事情在台灣大概收多少？下面的區間整理自公開來源，每一筆都標了出處。
          實際價格會因為地區、經驗、時段與急迫程度而變動，這裡只能給你一個起點。
        </p>
      </header>

      <div className="card border-brand-200 bg-brand-50/50 p-5">
        <p className="text-sm leading-relaxed">
          <span className="font-bold">先講清楚：</span>
          站上的真實報價還太少，所以下面大部分是
          <span className="font-semibold">別人的公開統計</span>，不是有空鴨自己的數據。
          等某個分類累積到 {MIN_SAMPLES} 筆以上的實際報價，這頁就會改用站上的中位數，
          並且標示樣本數。
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          唯一有法律底線的是
          <span className="font-semibold">時薪 ${MIN_WAGE.hourly} 元</span>
          （{MIN_WAGE.monthly.toLocaleString('zh-TW')} 元／月），2026 年起適用，
          來源：{MIN_WAGE.source}。受僱性質的工作低於這個數字是違法的。
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.name}>
          <h2 className="text-xl font-black tracking-tight">{g.name}</h2>

          <div className="mt-3 space-y-2">
            {g.rows.map((r) => {
              const c = categoryOf(r.category)!;
              const own = live.get(r.category);
              return (
                <div key={r.category} className="card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-bold">
                      <span className="mr-1.5">{c.emoji}</span>
                      {c.name}
                    </h3>
                    <p className="text-lg font-black text-brand-600">{formatRange(r)}</p>
                  </div>

                  {r.note && <p className="mt-1.5 text-sm text-ink-soft">{r.note}</p>}

                  {own ? (
                    <p className="mt-2 rounded-lg bg-ok-bg px-3 py-2 text-sm font-semibold text-ok">
                      站上中位數 ${own.median.toLocaleString('zh-TW')}／{UNIT_LABEL[r.unit]}
                      <span className="font-normal">（{own.n} 筆實際報價）</span>
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs text-ink-muted">
                    {r.official ? '✓ ' : ''}
                    來源：{r.source}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-black">你自己該收多少？</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          報低了自己難受，報高了對方不回 —— 這是所有人剛開始接案都會卡的地方。
          幾個實際一點的建議：
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
          <li>
            <span className="font-semibold text-ink">先從區間中間開始。</span>
            沒有人會因為你收中間價就不找你，但收最低價會讓人懷疑品質。
          </li>
          <li>
            <span className="font-semibold text-ink">把交通時間算進去。</span>
            一次 30 分鐘的服務，來回通勤 40 分鐘，你的實際時薪是帳面的一半。
          </li>
          <li>
            <span className="font-semibold text-ink">不同項目分開報價。</span>
            遛狗跟遛狗＋餵藥不是同一件事，一開始就分清楚，之後才不會被默默加工作。
          </li>
        </ul>
        <Link href="/how-much" className="btn-primary mt-5 w-full sm:w-auto">
          算算你的空檔值多少
        </Link>
      </section>
    </div>
  );
}
