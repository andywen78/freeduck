'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from './supabase/client';
import { isSupabaseConfigured } from './supabase/config';

export type UserState = {
  userId: string | null;
  loading: boolean;
  /** Supabase 尚未設定 —— 頁面應顯示提示而不是空白 */
  unconfigured: boolean;
};

export function useUser(): UserState {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { userId, loading, unconfigured: !isSupabaseConfigured };
}
