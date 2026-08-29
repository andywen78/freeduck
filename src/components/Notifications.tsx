'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export type Badges = {
  messages: number;
  invites: number;
  applications: number;
  contact_requests: number;
  reviews: number;
};

const ZERO: Badges = {
  messages: 0,
  invites: 0,
  applications: 0,
  contact_requests: 0,
  reviews: 0,
};

type Toast = { id: number; title: string; body?: string; href: string };

// 每次 provider 掛載都用不同的 channel topic。
// 同 topic 會拿到同一個 channel 實例，subscribe() 之後再 .on() 會直接拋錯。
let instanceSeq = 0;

type Ctx = {
  badges: Badges;
  refresh: () => void;
  /** 桌面通知授權狀態：unsupported / default / granted / denied */
  permission: string;
  askPermission: () => void;
};

const NotifCtx = createContext<Ctx>({
  badges: ZERO,
  refresh: () => {},
  permission: 'unsupported',
  askPermission: () => {},
});

export const useNotifications = () => useContext(NotifCtx);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>(ZERO);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permission, setPermission] = useState('unsupported');
  const userIdRef = useRef<string | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const askPermission = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    Notification.requestPermission().then(setPermission);
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userIdRef.current) return;
    const { data } = await supabaseBrowser().rpc('my_badges');
    if (data) setBadges(data as Badges);
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.floor(performance.now() % 1000);
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);

    // 分頁在背景時才跳系統通知，前景已經有 toast 了不用重複打擾
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.visibilityState !== 'visible'
    ) {
      try {
        new Notification(t.title, { body: t.body, tag: t.href, icon: '/duck.svg' });
      } catch {
        /* 某些瀏覽器在非 service worker 環境會擋，忽略即可 */
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = supabaseBrowser();
    const instance = ++instanceSeq;

    let channel: ReturnType<typeof sb.channel> | null = null;
    let currentUid: string | null = null;
    let cancelled = false;

    const stop = () => {
      if (channel) {
        sb.removeChannel(channel);
        channel = null;
      }
      currentUid = null;
    };

    const start = (uid: string) => {
      // effect 已經清掉了（React 19 開發模式會 mount→cleanup→mount）就別再開
      if (cancelled) return;
      // 同一個人已經在訂閱了，不要重複掛 listener
      if (currentUid === uid && channel) return;

      stop();
      currentUid = uid;
      userIdRef.current = uid;
      refresh();

      channel = sb
        .channel(`notify:${uid}:${instance}`)
        // 新訊息（RLS 保證只收得到自己對話裡的）
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const m = payload.new as {
              sender_id: string | null;
              body: string;
              conversation_id: string;
              kind?: string;
            };
            if (m.sender_id === uid) return;
            refresh();
            // 已經在那個對話裡就不要吵
            if (pathRef.current === `/chat/${m.conversation_id}`) return;
            push({
              // 系統訊息是「媒合成立」那種紀錄，標題講清楚比「新訊息」有用
              title: m.kind === 'system' ? '媒合成立' : '新訊息',
              body: m.body,
              href: `/chat/${m.conversation_id}`,
            });
          },
        )
        // 收到邀約
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'invites', filter: `worker_id=eq.${uid}` },
          () => {
            refresh();
            push({ title: '收到新的邀約', body: '有人想預約你的時段', href: '/me' });
          },
        )
        // 我的工作收到應徵
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'applications' },
          (payload) => {
            const a = payload.new as { worker_id: string };
            if (a.worker_id === uid) return; // 這是我自己送出去的
            refresh();
            push({ title: '有人應徵你的工作', href: '/me' });
          },
        )
        // 有人請求聯絡方式
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contact_requests',
            filter: `target_id=eq.${uid}`,
          },
          () => {
            refresh();
            push({ title: '有人請求你的聯絡方式', body: '到訊息裡決定要不要同意', href: '/chat' });
          },
        )
        // 狀態變更（邀約被接受、聯絡請求被同意…）
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'invites' },
          () => refresh(),
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'contact_requests' },
          (payload) => {
            const r = payload.new as { requester_id: string; status: string };
            refresh();
            if (r.requester_id === uid && r.status === 'approved') {
              push({ title: '對方同意分享聯絡方式了', href: '/chat' });
            }
          },
        )
        .subscribe();
    };

    sb.auth.getUser().then(({ data }) => {
      if (data.user) start(data.user.id);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      if (uid) {
        start(uid); // start 內部自己判斷要不要重掛
      } else {
        userIdRef.current = null;
        setBadges(ZERO);
        stop();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      stop();
    };
  }, [refresh, push]);

  // 換頁時重新算一次（例如剛把訊息標成已讀）
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  return (
    <NotifCtx.Provider value={{ badges, refresh, permission, askPermission }}>
      {children}

      {/* toast 疊在底部導覽之上 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end">
        {toasts.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="animate-rise pointer-events-auto w-full max-w-sm rounded-2xl border border-brand-200 bg-surface p-4 shadow-[0_8px_32px_-8px_rgb(28_25_23/0.28)]"
          >
            <p className="flex items-center gap-2 font-bold">
              <span className="text-lg">🦆</span>
              {t.title}
            </p>
            {t.body && (
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{t.body}</p>
            )}
          </Link>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}

/** 放在「我的頁面」，邀請使用者開啟桌面通知。 */
export function NotificationPermissionCard() {
  const { permission, askPermission } = useNotifications();

  if (permission !== 'default') return null;

  return (
    <div className="card flex flex-wrap items-center gap-3 border-duck-300 bg-duck-300/25 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-bold">開啟通知 🔔</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          有人邀約你或傳訊息時，即使切到別的分頁也會跳提醒。
        </p>
      </div>
      <button onClick={askPermission} className="btn-primary shrink-0">
        開啟
      </button>
    </div>
  );
}
