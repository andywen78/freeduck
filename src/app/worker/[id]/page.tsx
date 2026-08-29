import { notFound } from 'next/navigation';
import { Avatar, Stars } from '@/components/Avatar';
import { InviteDialog } from '@/components/InviteDialog';
import { ReviewList, type Review } from '@/components/ReviewList';
import { categoryOf } from '@/lib/categories';
import { DEMO_WORKERS } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
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
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'bio' | 'city' | 'district' | 'rating_avg' | 'rating_count'>;
  services: Service[];
  availabilities: Availability[];
  reviews: Review[];
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

    const [p, s, a, rv] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, city, district, rating_avg, rating_count')
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
    ]);

    loaded = p.data
      ? {
          profile: p.data as Loaded['profile'],
          services: (s.data as Service[]) ?? [],
          availabilities: (a.data as Availability[]) ?? [],
          reviews: (rv.data as Review[]) ?? [],
        }
      : null;
  } else {
    loaded = fromDemo(id);
  }

  if (!loaded) notFound();
  const { profile, services, availabilities, reviews } = loaded;

  const byDate = availabilities.reduce<Record<string, Availability[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      {/* -------------------------------------------------------- 評價 */}
      <ReviewList
        reviews={reviews}
        avg={profile.rating_avg}
        count={profile.rating_count}
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
