import { isSupabaseConfigured } from '@/lib/supabase/config';

/** Supabase 尚未接上時的提示條。接上金鑰後自動消失。 */
export function SetupBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="border-b border-duck-300 bg-duck-300/40 px-4 py-2.5 text-center text-[13px] text-ink-soft">
      <span className="font-semibold text-ink">示範模式</span>
      　資料為範例，尚未連上資料庫。填好{' '}
      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">.env.local</code>{' '}
      的 Supabase 金鑰後即為真實資料（見 README）。
    </div>
  );
}
