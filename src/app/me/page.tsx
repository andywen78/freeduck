'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, Stars } from '@/components/Avatar';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { NotificationPermissionCard } from '@/components/Notifications';
import { ReviewPrompt } from '@/components/ReviewPrompt';
import { Tabs } from '@/components/Tabs';
import { categoryOf } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatDate, formatRate, hhmm, utcNowNaive, type Profile, type RateUnit } from '@/lib/types';

type Party = { id: string; display_name: string; avatar_url: string | null };

type InviteRow = {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  message: string | null;
  offered_rate: number | null;
  employer_id: string;
  worker_id: string;
  availability: { date: string; start_time: string; end_time: string; ends_at_utc: string } | null;
  service: { category_id: string; title: string | null; rate: number | null; rate_unit: RateUnit } | null;
  employer: Party | null;
  worker: Party | null;
};

const STATUS_LABEL: Record<InviteRow['status'], string> = {
  pending: '等待回覆',
  accepted: '已接受',
  declined: '已婉拒',
  cancelled: '已取消',
  completed: '已完成',
};

const STATUS_TONE: Record<InviteRow['status'], string> = {
  pending: 'bg-warn-bg text-warn',
  accepted: 'bg-ok-bg text-ok',
  declined: 'bg-line text-ink-muted',
  cancelled: 'bg-line text-ink-muted',
  completed: 'bg-ok-bg text-ok',
};

const SELECT = `
  id, status, message, offered_rate, employer_id, worker_id,
  availability:availabilities(date, start_time, end_time, ends_at_utc),
  service:services(category_id, title, rate, rate_unit),
  employer:profiles!invites_employer_id_fkey(id, display_name, avatar_url),
  worker:profiles!invites_worker_id_fkey(id, display_name, avatar_url)
`;

type AppRow = {
  id: string;
  status: InviteRow['status'];
  message: string | null;
  worker_id: string;
  job: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    ends_at_utc: string;
    employer_id: string;
    category_id: string;
    rate: number | null;
    rate_unit: RateUnit;
  } | null;
  worker: Party | null;
};

const APP_SELECT = `
  id, status, message, worker_id,
  job:jobs!inner(id, title, date, start_time, end_time, ends_at_utc, employer_id, category_id, rate, rate_unit),
  worker:profiles!applications_worker_id_fkey(id, display_name, avatar_url)
`;

export default function MePage() {
  const router = useRouter();
  const { userId, loading, unconfigured } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [received, setReceived] = useState<InviteRow[]>([]);
  const [sent, setSent] = useState<InviteRow[]>([]);
  const [appsIn, setAppsIn] = useState<AppRow[]>([]);
  const [appsOut, setAppsOut] = useState<AppRow[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [counts, setCounts] = useState({ avail: 0, services: 0, jobs: 0 });
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const sb = supabaseBrowser();
    const nowUtc = utcNowNaive();

    const [p, inv, out, ain, aout, a, s, jb, rv] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
      sb.from('invites').select(SELECT).eq('worker_id', userId).order('created_at', { ascending: false }),
      sb.from('invites').select(SELECT).eq('employer_id', userId).order('created_at', { ascending: false }),
      // 我發布的工作收到的應徵
      sb.from('applications').select(APP_SELECT).eq('job.employer_id', userId).order('created_at', { ascending: false }),
      // 我送出的應徵
      sb.from('applications').select(APP_SELECT).eq('worker_id', userId).order('created_at', { ascending: false }),
      sb.from('availabilities').select('id', { count: 'exact', head: true }).eq('user_id', userId).gt('ends_at_utc', nowUtc),
      sb.from('services').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
      sb.from('jobs').select('id', { count: 'exact', head: true }).eq('employer_id', userId),
      // 評過的委託要移到「歷史」，所以要知道哪幾筆評過了
      sb.from('reviews').select('invite_id, application_id').eq('rater_id', userId),
    ]);

    setProfile((p.data as Profile) ?? null);
    setReceived((inv.data as unknown as InviteRow[]) ?? []);
    setSent((out.data as unknown as InviteRow[]) ?? []);
    setAppsIn((ain.data as unknown as AppRow[]) ?? []);
    setAppsOut((aout.data as unknown as AppRow[]) ?? []);
    setReviewed(
      new Set(
        ((rv.data as { invite_id: string | null; application_id: string | null }[]) ?? [])
          .flatMap((r) => [r.invite_id, r.application_id])
          .filter((x): x is string => !!x),
      ),
    );
    setCounts({ avail: a.count ?? 0, services: s.count ?? 0, jobs: jb.count ?? 0 });
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else if (!loading) setFetching(false);
  }, [userId, loading, load]);

  async function respond(id: string, status: 'accepted' | 'declined') {
    setReceived((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabaseBrowser().from('invites').update({ status }).eq('id', id);
  }

  async function respondApp(id: string, status: 'accepted' | 'declined') {
    setAppsIn((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabaseBrowser().from('applications').update({ status }).eq('id', id);
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/me" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  const nowUtc = utcNowNaive();

  /**
   * 「進行中」= 還有事要做：等回覆、已接受但還沒發生、時間到了但我還沒評。
   * 「歷史」  = 沒我的事了：評完了、被婉拒、被取消。
   */
  const isActive = (
    status: InviteRow['status'],
    endsAt: string | undefined,
    engagementId: string,
  ) => {
    if (status === 'pending') return true;
    if (status === 'declined' || status === 'cancelled') return false;
    const ended = !!endsAt && endsAt < nowUtc;
    if (!ended) return true;
    return !reviewed.has(engagementId); // 還沒評 → 留在進行中
  };

  const invActive = (r: InviteRow) => isActive(r.status, r.availability?.ends_at_utc, r.id);
  const appActive = (a: AppRow) => isActive(a.status, a.job?.ends_at_utc, a.id);

  const receivedNow = received.filter(invActive);
  const sentNow = sent.filter(invActive);
  const appsInNow = appsIn.filter(appActive);
  const appsOutNow = appsOut.filter(appActive);

  // 歷史合併成一條時間軸，比分四個區塊好讀
  const history = [
    ...received.filter((r) => !invActive(r)).map((r) => ({ k: 'inv' as const, r, side: 'worker' as const, on: r.availability?.date ?? '' })),
    ...sent.filter((r) => !invActive(r)).map((r) => ({ k: 'inv' as const, r, side: 'employer' as const, on: r.availability?.date ?? '' })),
    ...appsIn.filter((a) => !appActive(a)).map((a) => ({ k: 'app' as const, r: a, side: 'employer' as const, on: a.job?.date ?? '' })),
    ...appsOut.filter((a) => !appActive(a)).map((a) => ({ k: 'app' as const, r: a, side: 'worker' as const, on: a.job?.date ?? '' })),
  ].sort((x, y) => y.on.localeCompare(x.on));

  const activeCount =
    receivedNow.length + sentNow.length + appsInNow.length + appsOutNow.length;
  const pending = receivedNow.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------- 個人卡片 */}
      <section className="card flex items-center gap-4 p-5">
        <Avatar
          name={profile?.display_name ?? '鴨'}
          seed={userId}
          url={profile?.avatar_url}
          size={60}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight">
            {profile?.display_name ?? '尚未設定名稱'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <Stars avg={profile?.rating_avg ?? 0} count={profile?.rating_count ?? 0} />
            <span>
              {profile?.city ?? '未填地區'}
              {profile?.district ? ` · ${profile.district}` : ''}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Link href="/me/profile" className="btn-ghost !px-4 !py-2 text-xs">
            編輯
          </Link>
          {/* 使用者要能看到「別人看到的我」長什麼樣 */}
          <Link href={`/worker/${userId}`} className="btn-soft !px-4 !py-2 text-xs">
            預覽公開頁
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- 快速入口 */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/me/availability" className="card card-hover p-4">
          <span className="text-2xl">🗓️</span>
          <p className="mt-2 font-bold">我的空閒時段</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {counts.avail ? `${counts.avail} 個未來時段` : '還沒擺出任何空檔'}
          </p>
        </Link>
        <Link href="/me/services" className="card card-hover p-4">
          <span className="text-2xl">🧰</span>
          <p className="mt-2 font-bold">我能做的事</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {counts.services ? `${counts.services} 項服務接案中` : '還沒列出服務項目'}
          </p>
        </Link>
        <Link href="/me/jobs" className="card card-hover p-4">
          <span className="text-2xl">📣</span>
          <p className="mt-2 font-bold">我發布的工作</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {counts.jobs ? `${counts.jobs} 則 · 管理與編輯` : '還沒發布過，點這裡發一個'}
          </p>
        </Link>
      </section>

      <NotificationPermissionCard />

      {(!counts.avail || !counts.services) && (
        <div className="card border-duck-300 bg-duck-300/25 p-4 text-sm">
          <p className="font-bold">還差一步就能被找到 🦆</p>
          <p className="mt-1 text-ink-soft">
            要同時有
            <span className="font-semibold text-ink">空閒時段</span>和
            <span className="font-semibold text-ink">服務項目</span>
            ，你才會出現在搜尋結果裡。
          </p>
        </div>
      )}

      {/* ------------------------------------------------ 進行中 / 歷史 */}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'active', label: '進行中', count: activeCount },
          { key: 'history', label: '歷史', count: history.length },
        ]}
      />

      {tab === 'active' ? (
        <>
          <ReviewPrompt userId={userId} />

          <section className="space-y-3">
            <h2 className="font-bold">
              收到的邀約
              {pending.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pending.length} 個待回覆
                </span>
              )}
            </h2>

            {receivedNow.length === 0 ? (
              <div className="card px-6 py-8 text-center text-sm text-ink-soft">
                目前沒有進行中的邀約。把空檔和服務都填好，被找到的機會會高很多。
              </div>
            ) : (
              receivedNow.map((r) => (
                <InviteCard key={r.id} row={r} side="worker" onRespond={respond} />
              ))
            )}
          </section>

          {appsInNow.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold">
                我發布的工作收到的應徵
                {appsInNow.some((a) => a.status === 'pending') && (
                  <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                    {appsInNow.filter((a) => a.status === 'pending').length} 個待處理
                  </span>
                )}
              </h2>
              {appsInNow.map((a) => (
                <ApplicationCard key={a.id} row={a} side="employer" onRespond={respondApp} />
              ))}
            </section>
          )}

          {(sentNow.length > 0 || appsOutNow.length > 0) && (
            <section className="space-y-3">
              <h2 className="font-bold">我送出的</h2>
              {sentNow.map((r) => (
                <InviteCard key={r.id} row={r} side="employer" />
              ))}
              {appsOutNow.map((a) => (
                <ApplicationCard key={a.id} row={a} side="worker" />
              ))}
            </section>
          )}
        </>
      ) : history.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-ink-soft">
          還沒有完成的紀錄。
          <br />
          合作結束並互評之後，會自動移到這裡。
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-sm text-ink-soft">已完成、已婉拒、已取消的紀錄，依日期由新到舊。</p>
          {history.map((h) =>
            h.k === 'inv' ? (
              <InviteCard key={`i${h.r.id}`} row={h.r} side={h.side} />
            ) : (
              <ApplicationCard key={`a${h.r.id}`} row={h.r} side={h.side} />
            ),
          )}
        </section>
      )}

      <button onClick={signOut} className="btn-ghost w-full">
        登出
      </button>
    </div>
  );
}

function InviteCard({
  row,
  side,
  onRespond,
}: {
  row: InviteRow;
  side: 'worker' | 'employer';
  onRespond?: (id: string, s: 'accepted' | 'declined') => void;
}) {
  const other = side === 'worker' ? row.employer : row.worker;
  const cat = categoryOf(row.service?.category_id);

  return (
    <div className="card animate-rise p-4">
      <div className="flex items-start gap-3">
        <Avatar name={other?.display_name ?? '？'} seed={other?.id} url={other?.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {other?.display_name ?? '未知使用者'}
            <span className="ml-2 text-xs font-normal text-ink-muted">
              {side === 'worker' ? '邀請你' : '你邀請了'}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {cat?.emoji} {cat?.name ?? '未知服務'}
            {row.service?.title ? ` · ${row.service.title}` : ''}
            <span className="ml-2 font-bold text-ink">
              {formatRate(
                row.offered_rate ?? row.service?.rate ?? null,
                row.service?.rate_unit ?? 'negotiable',
              )}
            </span>
          </p>
          {row.availability && (
            <p className="mt-1 text-sm font-semibold text-brand-700">
              {formatDate(row.availability.date)} {hhmm(row.availability.start_time)}–
              {hhmm(row.availability.end_time)}
            </p>
          )}
          {row.message && (
            <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm text-ink-soft">
              「{row.message}」
            </p>
          )}
        </div>
        <span className={`chip shrink-0 !border-0 ${STATUS_TONE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
      </div>

      {side === 'worker' && row.status === 'pending' && onRespond && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onRespond(row.id, 'accepted')} className="btn-primary flex-1">
            接受
          </button>
          <button onClick={() => onRespond(row.id, 'declined')} className="btn-ghost flex-1">
            婉拒
          </button>
        </div>
      )}

      {row.status === 'accepted' && other && (
        <Link href={`/chat/new?to=${other.id}`} className="btn-soft mt-3 w-full">
          開始聊聊 · 交換聯絡方式
        </Link>
      )}
    </div>
  );
}

function ApplicationCard({
  row,
  side,
  onRespond,
}: {
  row: AppRow;
  side: 'worker' | 'employer';
  onRespond?: (id: string, s: 'accepted' | 'declined') => void;
}) {
  const cat = categoryOf(row.job?.category_id);

  return (
    <div className="card animate-rise p-4">
      <div className="flex items-start gap-3">
        {side === 'employer' ? (
          <Avatar
            name={row.worker?.display_name ?? '？'}
            seed={row.worker?.id}
            url={row.worker?.avatar_url}
            size={40}
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg">
            {cat?.emoji ?? '•'}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {side === 'employer' ? (
              <>
                {row.worker?.display_name ?? '未知使用者'}
                <span className="ml-2 text-xs font-normal text-ink-muted">應徵</span>
              </>
            ) : (
              <>
                你應徵了
                <span className="ml-2 text-xs font-normal text-ink-muted">工作</span>
              </>
            )}
          </p>

          {row.job && (
            <Link
              href={`/jobs/${row.job.id}`}
              className="mt-1 block text-sm font-semibold text-ink hover:text-brand-600"
            >
              {row.job.title}
              <span className="ml-2 font-normal text-ink-soft">
                {formatRate(row.job.rate, row.job.rate_unit)}
              </span>
            </Link>
          )}

          {row.job && (
            <p className="mt-1 text-sm font-semibold text-brand-700">
              {formatDate(row.job.date)} {hhmm(row.job.start_time)}–{hhmm(row.job.end_time)}
            </p>
          )}

          {row.message && (
            <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm text-ink-soft">
              「{row.message}」
            </p>
          )}
        </div>

        <span className={`chip shrink-0 !border-0 ${STATUS_TONE[row.status]}`}>
          {row.status === 'accepted' && side === 'employer' ? '已錄取' : STATUS_LABEL[row.status]}
        </span>
      </div>

      {side === 'employer' && row.status === 'pending' && onRespond && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onRespond(row.id, 'accepted')} className="btn-primary flex-1">
            錄取
          </button>
          <button onClick={() => onRespond(row.id, 'declined')} className="btn-ghost flex-1">
            婉拒
          </button>
        </div>
      )}

      {row.status === 'accepted' && (
        <Link
          href={`/chat/new?to=${side === 'employer' ? row.worker_id : row.job?.employer_id}`}
          className="btn-soft mt-3 w-full"
        >
          開始聊聊 · 交換聯絡方式
        </Link>
      )}
    </div>
  );
}
