import type { Metadata } from 'next';
import Link from 'next/link';
import { Pond, type PondDuck } from '@/components/Pond';
import { categoryOf } from '@/lib/categories';
import { clampDescription } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';
import { utcNowNaive, type RateUnit, type Service } from '@/lib/types';

export const metadata: Metadata = {
  title: '鴨池',
  description: clampDescription(
    '把「今天誰有空」畫成一池水。每個開放的時段是一隻鴨子，浮在它自己的時間上；現在時間的線爬到誰身上，誰就醒過來。',
  ),
  alternates: { canonical: '/pond' },
  openGraph: {
    type: 'website',
    url: '/pond',
    title: '鴨池｜有空鴨',
    description: '今天誰有空，一池水就看完了。',
  },
};

/** 水面要新鮮但不必即時，一分鐘重算一次 */
export const revalidate = 60;

/** 台北今天是幾號。伺服器跑 UTC，直接用 new Date() 會在深夜算錯一天 */
function taipeiToday(): string {
  const now = new Date();
  const tpe = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${tpe.getFullYear()}-${p(tpe.getMonth() + 1)}-${p(tpe.getDate())}`;
}

type Row = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
};

async function loadDucks(): Promise<PondDuck[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = supabaseAnon();

    const { data: slots } = await supabase
      .from('availabilities')
      .select('id, user_id, date, start_time, end_time')
      .eq('status', 'open')
      .gt('ends_at_utc', utcNowNaive())
      .order('date')
      .order('start_time')
      .limit(300);

    const rows = (slots ?? []) as Row[];
    if (!rows.length) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id))];

    const [{ data: people }, { data: services }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, city, district, status')
        .in('id', userIds),
      supabase
        .from('services')
        .select('user_id, category_id, rate, rate_unit')
        .in('user_id', userIds)
        .eq('is_active', true),
    ]);

    const byId = new Map(
      ((people ?? []) as { id: string; display_name: string; city: string | null; district: string | null; status?: string }[])
        .filter((p) => !p.status || p.status === 'active')
        .map((p) => [p.id, p]),
    );

    // 一個人可能有好幾項服務，池子裡只放得下一項 —— 挑報價最高的當代表
    const topService = new Map<string, Pick<Service, 'category_id' | 'rate' | 'rate_unit'>>();
    for (const s of (services ?? []) as Pick<Service, 'user_id' | 'category_id' | 'rate' | 'rate_unit'>[]) {
      const cur = topService.get(s.user_id);
      if (!cur || (s.rate ?? 0) > (cur.rate ?? 0)) topService.set(s.user_id, s);
    }

    return rows.flatMap((r) => {
      const p = byId.get(r.user_id);
      if (!p) return [];   // 停權的人不放進池子
      const s = topService.get(r.user_id);
      return [{
        id: r.id,
        workerId: r.user_id,
        name: p.display_name,
        date: r.date,
        start: r.start_time,
        end: r.end_time,
        where: [p.city, p.district].filter(Boolean).join(''),
        service: s ? categoryOf(s.category_id)?.name ?? null : null,
        rate: s?.rate ?? null,
        rateUnit: (s?.rate_unit ?? 'negotiable') as RateUnit,
      }];
    });
  } catch {
    return [];   // 撈不到就給空池子，水還是會動
  }
}

export default async function Page() {
  const ducks = await loadDucks();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">鴨池</h1>
        <p className="mt-2 text-ink-soft">
          今天誰有空，一池水就看完了。鴨子浮在自己的時段上，
          <span className="font-semibold text-ink">現在</span>那條線爬到誰身上，誰就醒過來。
        </p>
      </header>

      <Pond ducks={ducks} today={taipeiToday()} />

      <section className="card p-5 sm:p-6">
        <h2 className="font-black">想讓自己的鴨子浮上來？</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          擺出一個時段就會出現在這裡。不用履歷、不用等人應徵 ——
          你只是把「我這天有空、可以做什麼」放到看得到的地方。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/how-much" className="btn-primary sm:w-auto">
            先算算我的空檔值多少
          </Link>
          <Link href="/signup" className="btn-ghost btn-soft sm:w-auto">
            直接建立檔案
          </Link>
        </div>
      </section>
    </div>
  );
}
