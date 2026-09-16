import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar, Stars } from '@/components/Avatar';
import { InviteDialog } from '@/components/InviteDialog';
import { ReviewList, type Review } from '@/components/ReviewList';
import type { Reply } from '@/components/ReviewReply';
import { SafetyActions } from '@/components/SafetyActions';
import { ShareProfile } from '@/components/ShareProfile';
import { categoryOf } from '@/lib/categories';
import { DEMO_WORKERS } from '@/lib/demo';
import { clampDescription, pageTitle, SITE_URL } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';
import { supabaseServer } from '@/lib/supabase/server';
import {
  formatDate,
  formatRate,
  hhmm,
  utcNowNaive,
  type Availability,
  type Profile,
  type Service,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Loaded = {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'bio' | 'city' | 'district' | 'rating_avg' | 'rating_count'> & {
    status?: string;
  };
  services: Service[];
  availabilities: Availability[];
  reviews: Review[];
  replies: Record<string, Reply>;
  viewerId: string | null;
  blocked: boolean;
};

/** 示範模式：從假資料組出同樣的結構 */
function fromDemo(id: string): Loaded | null {
  const w = DEMO_WORKERS.find((d) => d.worker_id === id);
  if (!w) return null;
  return {
    profile: {
      id: w.worker_id,
      display_name: w.display_name,
      avatar_url: w.avatar_url,
      bio: w.bio,
      city: w.city,
      district: w.district,
      rating_avg: w.rating_avg,
      rating_count: w.rating_count,
    },
    services: (w.services ?? []).map((s) => ({
      ...s,
      user_id: w.worker_id,
      is_active: true,
    })),
    availabilities: [
      {
        id: w.availability_id,
        user_id: w.worker_id,
        date: w.avail_date,
        start_time: w.start_time,
        end_time: w.end_time,
        status: 'open' as const,
      },
    ],
    reviews: [],
    replies: {},
    viewerId: null,
    blocked: false,
  };
}

/** generateMetadata 只需要這幾欄，不必背整個 Profile */
type MetaProfile = Pick<Profile, 'display_name' | 'bio' | 'city' | 'district'>;
type MetaService = Pick<Service, 'category_id' | 'rate' | 'rate_unit'>;

/** 搜尋結果上真正在賣的那一行：誰、在哪、能做什麼、多少錢。 */
function describe(p: MetaProfile, services: MetaService[]) {
  const where = [p.city, p.district].filter(Boolean).join('');
  const names = services.map((s) => categoryOf(s.category_id)?.name).filter(Boolean);
  // 標題只留三項——搜尋結果大約 30 個中文字就截斷，列滿六項等於後面全被吃掉
  const what = names.length
    ? names.slice(0, 3).join('、') + (names.length > 3 ? ` 等 ${names.length} 項` : '')
    : '多項服務';
  const cheapest = services
    .map((s) => formatRate(s.rate, s.rate_unit))
    .find((r) => r !== '面議');

  const title = [p.display_name, [where, what].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');

  const description = clampDescription(
    p.bio?.trim() ||
      `${p.display_name}${where ? `在${where}` : ''}提供${what}${cheapest ? `，${cheapest} 起` : ''}。查看有空的時段，直接線上預約。`,
  );

  return { title, description, what, where };
}

/**
 * 貼到社團／限動的現成文案。
 *
 * 自己看到的是第一人稱（他是要去招生意的），別人看到的是第三人稱介紹。
 * 網址不寫在這裡 —— ShareProfile 會自己接在最後，才不會重複。
 */
function shareText(
  p: Pick<Profile, 'display_name' | 'city' | 'district'>,
  services: Service[],
  availabilities: Availability[],
  owner: boolean,
): string {
  const where = [p.city, p.district].filter(Boolean).join('');
  const what = services
    .slice(0, 3)
    .map((s) => `${categoryOf(s.category_id)?.name ?? '服務'} ${formatRate(s.rate, s.rate_unit)}`)
    .join('、');
  const when = availabilities
    .slice(0, 3)
    .map((a) => `${formatDate(a.date)} ${hhmm(a.start_time)}–${hhmm(a.end_time)}`)
    .join('、');

  return [
    owner ? '我在有空鴨擺出了空檔 🦆' : `${where ? `${where} ` : ''}${p.display_name}．有空鴨`,
    when && `${owner ? '有空的時段' : '最近有空'}：${when}`,
    what && `能做：${what}`,
    owner && where && `地點：${where}`,
    owner ? '想約的話點連結，直接選時段 👇' : '點連結可以直接選時段預約 👇',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let p: MetaProfile | null = null;
  let services: MetaService[] = [];

  if (isSupabaseConfigured) {
    const supabase = supabaseAnon();
    const [prof, svc] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, bio, city, district, status')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('services').select('category_id, rate, rate_unit').eq('user_id', id).eq('is_active', true),
    ]);

    // 停權帳號的頁面只剩一句「已停權」，別讓它帶著漂亮標題留在搜尋結果裡
    const row = prof.data as (MetaProfile & { status?: string }) | null;
    if (row && row.status && row.status !== 'active') {
      return { title: '這個帳號已停權', robots: { index: false, follow: false } };
    }
    p = row;
    services = (svc.data as MetaService[]) ?? [];
  } else {
    const w = DEMO_WORKERS.find((d) => d.worker_id === id);
    if (w) {
      p = { display_name: w.display_name, bio: w.bio, city: w.city, district: w.district };
      services = w.services ?? [];
    }
  }

  if (!p) return { title: '找不到這個人', robots: { index: false, follow: false } };

  const { title, description } = describe(p, services);
  const url = `/worker/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'profile', url, title: pageTitle(title), description },
    twitter: { card: 'summary_large_image', title: pageTitle(title), description },
  };
}

export default async function WorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const preselect = typeof sp.availability === 'string' ? sp.availability : undefined;

  let loaded: Loaded | null;

  if (isSupabaseConfigured) {
    const supabase = await supabaseServer();
    const nowUtc = utcNowNaive();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id ?? null;

    const [p, s, a, rv, bl] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, city, district, rating_avg, rating_count, status')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('services').select('*').eq('user_id', id).eq('is_active', true),
      supabase
        .from('availabilities')
        .select('*')
        .eq('user_id', id)
        .eq('status', 'open')
        .gt('ends_at_utc', nowUtc)
        .order('date')
        .order('start_time'),
      supabase.rpc('reviews_of', { p_user: id }),
      // blocks 的 RLS 只讓人看到自己封鎖了誰，所以這裡撈到就代表是「我封鎖了他」
      viewerId
        ? supabase.from('blocks').select('blocked_id').eq('blocker_id', viewerId).eq('blocked_id', id)
        : Promise.resolve({ data: [] as { blocked_id: string }[] }),
    ]);

    const reviews = (rv.data as Review[]) ?? [];
    const ids = reviews.map((r) => r.id);
    const rp = ids.length
      ? await supabase.from('review_replies').select('review_id, body, created_at').in('review_id', ids)
      : { data: [] as { review_id: string; body: string; created_at: string }[] };

    loaded = p.data
      ? {
          profile: p.data as Loaded['profile'],
          services: (s.data as Service[]) ?? [],
          availabilities: (a.data as Availability[]) ?? [],
          reviews,
          replies: Object.fromEntries(
            (rp.data ?? []).map((r) => [r.review_id, { body: r.body, created_at: r.created_at }]),
          ),
          viewerId,
          blocked: ((bl.data as { blocked_id: string }[] | null) ?? []).length > 0,
        }
      : null;
  } else {
    loaded = fromDemo(id);
  }

  if (!loaded) notFound();
  const { profile, services, availabilities, reviews, replies, viewerId, blocked } = loaded;

  // 停權的帳號只留一句話，服務、時段、評價、邀約全部不出現
  if (profile.status && profile.status !== 'active') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card px-5 py-10 text-center">
          <p className="text-3xl">🦆</p>
          <p className="mt-3 font-bold">這個帳號已停權</p>
          <p className="mt-1 text-sm text-ink-soft">
            內容已下架。如果你正在跟這個人接洽，請多加留意。
          </p>
        </div>
      </div>
    );
  }

  const byDate = availabilities.reduce<Record<string, Availability[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  const seo = describe(profile, services);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 本地服務的搜尋結果吃 Person + Offer：地區、項目、價格、評分 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            '@id': `${SITE_URL}/worker/${profile.id}#person`,
            name: profile.display_name,
            url: `${SITE_URL}/worker/${profile.id}`,
            description: seo.description,
            ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
            ...(seo.where
              ? { address: { '@type': 'PostalAddress', addressLocality: seo.where, addressCountry: 'TW' } }
              : {}),
            ...(profile.rating_count > 0
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: profile.rating_avg,
                    reviewCount: profile.rating_count,
                  },
                }
              : {}),
            makesOffer: services.map((s) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: s.title || categoryOf(s.category_id)?.name || '服務',
                ...(seo.where ? { areaServed: seo.where } : {}),
              },
              ...(s.rate != null && s.rate_unit !== 'negotiable'
                ? {
                    price: s.rate,
                    priceCurrency: 'TWD',
                    unitText: s.rate_unit === 'daily' ? '日' : '小時',
                  }
                : {}),
            })),
          }),
        }}
      />
      {/* ---------------------------------------------------------- 頭 */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar name={profile.display_name} seed={profile.id} url={profile.avatar_url} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight">{profile.display_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <Stars avg={profile.rating_avg} count={profile.rating_count} />
              <span>
                {profile.city ?? '未填地區'}
                {profile.district ? ` · ${profile.district}` : ''}
              </span>
            </div>
          </div>
        </div>
        {profile.bio && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{profile.bio}</p>
        )}
      </section>

      {/* ------------------------------------------------------ 服務項目 */}
      <section>
        <h2 className="font-bold">能做的事</h2>
        <div className="mt-3 space-y-2">
          {services.length === 0 ? (
            <p className="card px-5 py-6 text-center text-sm text-ink-soft">尚未列出服務項目</p>
          ) : (
            services.map((s) => {
              const c = categoryOf(s.category_id);
              return (
                <div key={s.id} className="card flex items-center gap-3 p-4">
                  <span className="text-2xl">{c?.emoji ?? '•'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{c?.name ?? '其他'}</p>
                    {s.title && <p className="text-sm text-ink-soft">{s.title}</p>}
                    {s.note && <p className="mt-0.5 text-xs text-ink-muted">{s.note}</p>}
                  </div>
                  <span className="shrink-0 text-lg font-black text-brand-600">
                    {formatRate(s.rate, s.rate_unit)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- 空檔 */}
      <section>
        <h2 className="font-bold">可預約的時段</h2>
        <div className="mt-3 space-y-2">
          {availabilities.length === 0 ? (
            <p className="card px-5 py-6 text-center text-sm text-ink-soft">
              目前沒有開放的時段
            </p>
          ) : (
            Object.entries(byDate).map(([date, list]) => (
              <div key={date} className="card flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                <span className="font-bold">{formatDate(date)}</span>
                {list.map((a) => (
                  <span key={a.id} className="chip !bg-brand-50 !text-brand-700">
                    {hhmm(a.start_time)}–{hhmm(a.end_time)}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- 分享 */}
      {(services.length > 0 || availabilities.length > 0) && (
        <ShareProfile
          url={`${SITE_URL}/worker/${profile.id}`}
          text={shareText(profile, services, availabilities, viewerId === profile.id)}
          owner={viewerId === profile.id}
        />
      )}

      {/* -------------------------------------------------------- 評價 */}
      <ReviewList
        reviews={reviews}
        avg={profile.rating_avg}
        count={profile.rating_count}
        replies={replies}
        canReplyAs={viewerId === profile.id ? viewerId : null}
      />

      {/* ------------------------------------------------ 檢舉 / 封鎖 */}
      <SafetyActions
        targetId={profile.id}
        targetName={profile.display_name}
        initialBlocked={blocked}
      />

      {/* -------------------------------------------------------- 邀約 */}
      <section className="sticky bottom-20 md:bottom-6">
        <InviteDialog
          workerId={profile.id}
          workerName={profile.display_name}
          availabilities={availabilities}
          services={services}
          preselectAvailability={preselect}
        />
      </section>
    </div>
  );
}
