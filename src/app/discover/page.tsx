import { Filters, type FilterValues } from '@/components/Filters';
import { WorkerCard } from '@/components/WorkerCard';
import { EmptyState } from '@/components/EmptyState';
import { categoryOf } from '@/lib/categories';
import { DEMO_WORKERS } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import type { WorkerHit } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

function one(sp: SP, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

/** 示範模式：在記憶體裡套用跟 search_workers 相同的篩選規則。 */
function filterDemo(f: FilterValues): WorkerHit[] {
  return DEMO_WORKERS.filter((w) => {
    if (f.date && w.avail_date !== f.date) return false;
    if (f.start && w.start_time.slice(0, 5) > f.start) return false;
    if (f.end && w.end_time.slice(0, 5) < f.end) return false;
    if (f.city && w.city !== f.city) return false;
    if (f.district && w.district !== f.district) return false;
    if (f.category && !(w.services ?? []).some((s) => s.category_id === f.category)) return false;
    return true;
  }).map((w) =>
    // 篩了分類就只留該分類的服務，跟 RPC 的行為一致
    f.category ? { ...w, services: (w.services ?? []).filter((s) => s.category_id === f.category) } : w,
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const f: FilterValues = {
    date: one(sp, 'date'),
    start: one(sp, 'start'),
    end: one(sp, 'end'),
    category: one(sp, 'category'),
    city: one(sp, 'city'),
    district: one(sp, 'district'),
  };

  let hits: WorkerHit[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await supabaseServer();
    const { data, error: err } = await supabase.rpc('search_workers', {
      p_date: f.date || null,
      p_start: f.start || null,
      p_end: f.end || null,
      p_category: f.category || null,
      p_city: f.city || null,
      p_district: f.district || null,
    });
    if (err) error = err.message;
    hits = (data as WorkerHit[]) ?? [];
  } else {
    hits = filterDemo(f);
  }

  const cat = categoryOf(f.category);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight">
          {cat ? `找${cat.name}的人` : '誰有空？'}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          列出的是<span className="font-semibold text-ink">人的空檔</span>，不是職缺。
          挑一個時段直接邀約。
        </p>
      </header>

      <Filters initial={f} basePath="/discover" />

      {error && (
        <div className="card border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          搜尋失敗：{error}
          <p className="mt-1 text-xs text-ink-soft">
            請確認已在 Supabase SQL Editor 執行 supabase/migrations 底下的兩個檔案。
          </p>
        </div>
      )}

      {hits.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-ink-soft">
            找到 {hits.length} 個可預約的時段
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {hits.map((h, i) => (
              <WorkerCard key={h.availability_id} hit={h} index={i} />
            ))}
          </div>
        </>
      ) : (
        !error && (
          <EmptyState
            emoji="🦆"
            title="這個條件下還沒有人有空"
            body="試著放寬日期或分類。冷啟動階段人還不多，也歡迎你自己擺一個時段上來。"
            actionHref="/me/availability"
            actionLabel="擺出我的空檔"
          />
        )
      )}
    </div>
  );
}
