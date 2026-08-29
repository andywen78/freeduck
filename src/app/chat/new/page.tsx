'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';

/** /chat/new?to=<userId> —— 取得或建立對話後直接轉過去 */
function Starter() {
  const router = useRouter();
  const to = useSearchParams().get('to');
  const { userId, loading, unconfigured } = useUser();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (unconfigured || loading || !userId || !to) return;
    supabaseBrowser()
      .rpc('get_or_create_conversation', { other: to })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else router.replace(`/chat/${data}`);
      });
  }, [userId, to, loading, unconfigured, router]);

  if (unconfigured) return <NeedsSetup />;
  if (!to) return <p className="card p-8 text-center text-sm text-ink-soft">缺少對象</p>;
  if (err) return <p className="card p-8 text-center text-sm text-brand-800">{err}</p>;
  return <Loading rows={1} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading rows={1} />}>
      <Starter />
    </Suspense>
  );
}
