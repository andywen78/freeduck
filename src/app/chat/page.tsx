'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';

type Row = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_at: string | null;
  a: { display_name: string; avatar_url: string | null } | null;
  b: { display_name: string; avatar_url: string | null } | null;
};

function ago(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  if (mins < 1440) return `${Math.floor(mins / 60)} 小時前`;
  return `${Math.floor(mins / 1440)} 天前`;
}

export default function ChatListPage() {
  const { userId, loading, unconfigured } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabaseBrowser()
      .from('conversations')
      .select(
        `id, user_a, user_b, last_message, last_message_at,
         a:profiles!conversations_user_a_fkey(display_name, avatar_url),
         b:profiles!conversations_user_b_fkey(display_name, avatar_url)`,
      )
      .order('last_message_at', { ascending: false, nullsFirst: false });
    setRows((data as unknown as Row[]) ?? []);
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else if (!loading) setFetching(false);
  }, [userId, loading, load]);

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/chat" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-black tracking-tight">訊息</h1>

      {rows.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="還沒有任何對話"
          body="邀約被接受、或應徵被錄取之後，就可以在這裡跟對方聊細節。"
          actionHref="/discover"
          actionLabel="去找有空的人"
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const otherId = r.user_a === userId ? r.user_b : r.user_a;
            const other = r.user_a === userId ? r.b : r.a;
            return (
              <Link
                key={r.id}
                href={`/chat/${r.id}`}
                className="card card-hover flex items-center gap-3 p-4"
              >
                <Avatar
                  name={other?.display_name ?? '？'}
                  seed={otherId}
                  url={other?.avatar_url}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{other?.display_name ?? '未知使用者'}</p>
                  <p className="truncate text-sm text-ink-soft">
                    {r.last_message ?? '還沒有訊息'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">{ago(r.last_message_at)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
