'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { useNotifications } from '@/components/Notifications';
import { categoryOf } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatDate, formatRate, hhmm, type RateUnit } from '@/lib/types';

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string | null; // 系統訊息沒有發送者
  body: string;
  created_at: string;
  kind?: 'text' | 'system';
  meta?: SystemMeta | null;
};

/** 接受邀約／錄取應徵時由資料庫觸發器寫入，用來標示「這段對話接下來在講哪一筆」 */
type SystemMeta = {
  type: 'invite_accepted' | 'application_accepted';
  date: string;
  start_time: string;
  end_time: string;
  category_id?: string | null;
  title?: string | null;
  rate?: number | null;
  rate_unit?: RateUnit | null;
  job_id?: string | null;
};

type Other = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type Contact = { phone: string | null; line_id: string | null };

type ContactRequest = {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'approved' | 'declined';
};

// 同 topic 的 channel 會共用實例，subscribe 後再 .on() 會拋錯；每次掛載給不同 topic
let threadSeq = 0;

function clock(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const { userId, loading, unconfigured } = useUser();
  const { refresh: refreshBadges } = useNotifications();

  const [other, setOther] = useState<Other | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [myContact, setMyContact] = useState<Contact | null>(null);
  const [myReq, setMyReq] = useState<ContactRequest | null>(null);
  const [theirReq, setTheirReq] = useState<ContactRequest | null>(null);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const sb = supabaseBrowser();

    const { data: conv } = await sb
      .from('conversations')
      .select('user_a, user_b')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) {
      setFetching(false);
      return;
    }

    const otherId = conv.user_a === userId ? conv.user_b : conv.user_a;

    const [p, c, m, r, mine] = await Promise.all([
      sb.from('profiles').select('id, display_name, avatar_url').eq('id', otherId).maybeSingle(),
      // RLS 決定看不看得到：只有對方按過「同意」才撈得到
      sb.from('contacts').select('phone, line_id').eq('user_id', otherId).maybeSingle(),
      sb
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at')
        .limit(300),
      // RLS 已限定只回傳跟我有關的，再挑出跟這位對象的
      sb
        .from('contact_requests')
        .select('id, requester_id, target_id, status')
        .or(`requester_id.eq.${otherId},target_id.eq.${otherId}`),
      // 我自己填了什麼 —— 用來提醒「你同意了但沒東西可給」
      sb.from('contacts').select('phone, line_id').eq('user_id', userId).maybeSingle(),
    ]);

    const reqs = (r.data as ContactRequest[]) ?? [];
    setOther((p.data as Other) ?? null);
    setContact((c.data as Contact) ?? null);
    setMyContact((mine.data as Contact) ?? null);
    setMyReq(reqs.find((x) => x.requester_id === userId) ?? null);
    setTheirReq(reqs.find((x) => x.target_id === userId) ?? null);
    setMsgs((m.data as Msg[]) ?? []);
    setFetching(false);

    // 進來就把對方傳的訊息標成已讀，未讀徽章跟著歸零
    await sb.rpc('mark_thread_read', { conv: conversationId });
    refreshBadges();
  }, [userId, conversationId, refreshBadges]);

  async function requestContact() {
    if (!userId || !other) return;
    setReqBusy(true);
    setReqErr(null);

    const { data, error } = await supabaseBrowser()
      .from('contact_requests')
      .insert({ requester_id: userId, target_id: other.id })
      .select('id, requester_id, target_id, status')
      .single();

    setReqBusy(false);
    if (error) {
      setReqErr(
        error.code === '42501' || /row-level security/i.test(error.message)
          ? '要等媒合成立（邀約被接受或應徵被錄取）之後才能請求聯絡方式'
          : error.message,
      );
      return;
    }
    setMyReq(data as ContactRequest);
  }

  async function respondContact(status: 'approved' | 'declined') {
    if (!theirReq) return;
    setTheirReq({ ...theirReq, status });
    await supabaseBrowser().from('contact_requests').update({ status }).eq('id', theirReq.id);
    refreshBadges();
  }

  useEffect(() => {
    if (userId) load();
    else if (!loading) setFetching(false);
  }, [userId, loading, load]);

  // 即時訂閱新訊息
  useEffect(() => {
    if (!userId || unconfigured) return;
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`thread:${conversationId}:${++threadSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          // 人就在這個對話裡，直接標已讀，未讀數不要跳出來
          if (m.sender_id !== userId) {
            sb.rpc('mark_thread_read', { conv: conversationId }).then(() => refreshBadges());
          }
        },
      )
      // 聯絡方式請求有動靜（對方同意/拒絕、或對方來請求）就重新載入這頁的狀態
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_requests' },
        () => load(),
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [conversationId, userId, unconfigured, refreshBadges, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !userId) return;

    setSending(true);
    setText('');
    const { error } = await supabaseBrowser()
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body });
    setSending(false);
    if (error) setText(body); // 送失敗把字還給使用者
  }

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading rows={4} />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href={`/login?next=/chat/${conversationId}`} className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );
  if (!other)
    return <p className="card p-8 text-center text-sm text-ink-soft">找不到這個對話</p>;

  // ★ 解鎖與否看的是「對方同意了沒」，不是「他填了沒」。
  //   contact 撈得到就代表 RLS 放行了（他同意了），欄位可能是空的。
  const unlocked = myReq?.status === 'approved' || !!contact;
  const contactEmpty = !contact?.phone && !contact?.line_id;
  const myContactEmpty = !myContact?.phone && !myContact?.line_id;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <header className="flex items-center gap-3 pb-4">
        <Link href="/chat" className="text-lg text-ink-muted hover:text-brand-600">
          ←
        </Link>
        <Avatar name={other.display_name} seed={other.id} url={other.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{other.display_name}</p>
        </div>
        <Link href={`/worker/${other.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">
          看他的頁面
        </Link>
      </header>

      {/* 對方請求我的聯絡方式 —— 由我決定 */}
      {theirReq?.status === 'pending' && (
        <div className="card animate-rise mb-3 border-duck-300 bg-duck-300/25 p-4">
          <p className="font-bold">{other.display_name} 想要你的聯絡方式</p>
          <p className="mt-1 text-sm text-ink-soft">
            同意後他會看到你在「基本資料」裡填的手機與 LINE ID。你隨時可以不同意，
            也可以只在訊息裡直接告訴他。
          </p>
          {myContactEmpty && (
            <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed text-warn">
              你的基本資料還沒填手機或 LINE ID —— 現在同意的話對方會看到空的。
              <Link href="/me/profile" className="ml-1 font-bold underline">
                先去填
              </Link>
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={() => respondContact('approved')} className="btn-primary flex-1">
              同意分享
            </button>
            <button onClick={() => respondContact('declined')} className="btn-ghost flex-1">
              不同意
            </button>
          </div>
        </div>
      )}
      {theirReq?.status === 'approved' &&
        (myContactEmpty ? (
          <p className="mb-3 rounded-xl bg-warn-bg px-4 py-2.5 text-center text-xs leading-relaxed text-warn">
            你已同意分享給 {other.display_name}，但基本資料裡沒有手機也沒有 LINE ID，
            他那邊會是空的。
            <Link href="/me/profile" className="ml-1 font-bold underline">
              去補上
            </Link>
          </p>
        ) : (
          <p className="mb-3 rounded-xl bg-ok-bg px-4 py-2.5 text-center text-xs font-semibold text-ok">
            你已同意分享聯絡方式給 {other.display_name}
          </p>
        ))}

      {/* 我這邊的狀態 */}
      {unlocked ? (
        <div className="card mb-4 border-ok/30 bg-ok-bg/60 p-4 text-sm">
          <p className="font-bold text-ok">✓ {other.display_name} 已同意分享聯絡方式</p>
          {contactEmpty ? (
            <p className="mt-1.5 leading-relaxed text-ink-soft">
              但他還沒在基本資料裡填手機或 LINE ID，所以這裡是空的。
              <span className="text-ink-muted">直接在下面的訊息裡問他就好。</span>
            </p>
          ) : (
            <p className="mt-1.5 text-ink-soft">
              {contact?.phone && (
                <>
                  手機{' '}
                  <a href={`tel:${contact.phone}`} className="font-bold text-ink underline">
                    {contact.phone}
                  </a>
                </>
              )}
              {contact?.phone && contact?.line_id && '　'}
              {contact?.line_id && (
                <>
                  LINE <span className="font-bold text-ink">{contact.line_id}</span>
                </>
              )}
            </p>
          )}
        </div>
      ) : myReq?.status === 'pending' ? (
        <p className="mb-4 rounded-xl bg-warn-bg px-4 py-2.5 text-center text-xs font-semibold text-warn">
          已送出請求，等 {other.display_name} 決定
        </p>
      ) : myReq?.status === 'declined' ? (
        <p className="mb-4 rounded-xl bg-cream px-4 py-2.5 text-center text-xs text-ink-muted">
          {other.display_name} 不同意分享聯絡方式 —— 直接在訊息裡談就好
        </p>
      ) : (
        <div className="mb-4 rounded-xl bg-cream px-4 py-3">
          <p className="text-center text-xs leading-relaxed text-ink-muted">
            🔒 聯絡方式不會自動交換。需要的話可以請求，由對方決定要不要給。
          </p>
          <button
            onClick={requestContact}
            disabled={reqBusy}
            className="btn-ghost mt-2.5 w-full !py-2 text-xs"
          >
            {reqBusy ? '送出中…' : '請求聯絡方式'}
          </button>
          {reqErr && (
            <p className="mt-2 text-center text-xs text-brand-700">{reqErr}</p>
          )}
        </div>
      )}

      <div className="min-h-[45dvh] space-y-2.5">
        {msgs.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-muted">
            還沒有訊息，先打個招呼吧 🦆
          </p>
        )}
        {msgs.map((m) => {
          if (m.kind === 'system') return <SystemNote key={m.id} msg={m} />;
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? 'rounded-br-md bg-brand-500 text-white'
                    : 'rounded-bl-md border border-line bg-surface'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-ink-muted'}`}>
                  {clock(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-20 mt-4 flex gap-2 rounded-2xl border border-line bg-surface p-2 md:bottom-4"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="輸入訊息…"
          maxLength={2000}
          className="flex-1 bg-transparent px-3 py-2 outline-none"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary !px-5">
          送出
        </button>
      </form>
    </div>
  );
}

/** 置中的委託紀錄卡片 —— 同一個人多次合作時用來分段 */
function SystemNote({ msg }: { msg: Msg }) {
  const meta = msg.meta;
  const cat = categoryOf(meta?.category_id ?? undefined);
  const isJob = meta?.type === 'application_accepted';

  // 舊資料或 meta 壞掉時退回純文字，不要整頁炸掉
  if (!meta) {
    return (
      <p className="py-2 text-center text-xs text-ink-muted">{msg.body}</p>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-cream px-4 py-3 text-center">
        <p className="text-xs font-bold text-ok">
          ✓ {isJob ? '已錄取應徵' : '已接受邀約'}
        </p>
        <p className="mt-1 text-sm font-bold text-ink">
          {formatDate(meta.date)} {hhmm(meta.start_time)}–{hhmm(meta.end_time)}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {cat ? `${cat.emoji} ${cat.name}` : ''}
          {meta.title ? `${cat ? ' · ' : ''}${meta.title}` : ''}
          {meta.rate_unit ? ` · ${formatRate(meta.rate ?? null, meta.rate_unit)}` : ''}
        </p>
        {isJob && meta.job_id && (
          <Link
            href={`/jobs/${meta.job_id}`}
            className="mt-1.5 inline-block text-xs font-semibold text-brand-600 underline underline-offset-2"
          >
            看這份工作
          </Link>
        )}
      </div>
    </div>
  );
}
