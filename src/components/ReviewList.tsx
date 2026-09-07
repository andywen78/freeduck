import { Avatar } from './Avatar';
import { ReviewReply, type Reply } from './ReviewReply';
import { StarRow } from './StarInput';

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater_id: string;
  rater_name: string;
  rater_avatar: string | null;
};

function when(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function ReviewList({
  reviews,
  avg,
  count,
  replies = {},
  canReplyAs = null,
}: {
  reviews: Review[];
  avg: number;
  count: number;
  /** review_id → 該則評價的公開回應 */
  replies?: Record<string, Reply>;
  /** 看的人就是被評的本人時，帶入他的 id，才會出現回應入口 */
  canReplyAs?: string | null;
}) {
  // 5→1 星各有幾則。長條長度用「總則數」當分母，等於直接看百分比
  // （用最多的那一列當分母的話，只有 1 則評價也會畫成滿格，會誤導）
  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    c: reviews.filter((r) => r.rating === n).length,
  }));
  const total = Math.max(1, reviews.length);

  // 則數太少時分佈圖沒有意義，只會讓人誤判，直接不畫
  const showDist = reviews.length >= 3;

  return (
    <section>
      <h2 className="font-bold">評價</h2>

      {count === 0 ? (
        <p className="card mt-3 px-5 py-6 text-center text-sm text-ink-soft">
          還沒有人評價過。合作結束後雙方都可以互評。
        </p>
      ) : (
        <>
          <div className="card mt-3 flex items-center gap-5 p-5">
            <div className="text-center">
              <p className="text-4xl font-black leading-none text-ink">
                {Number(avg).toFixed(1)}
              </p>
              <div className="mt-1.5">
                <StarRow rating={Math.round(avg)} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">{count} 則評價</p>
            </div>

            {showDist ? (
              <div className="flex-1 space-y-1">
                {dist.map((d) => (
                  <div
                    key={d.n}
                    className="flex items-center gap-2"
                    title={`${d.n} 星：${d.c} 則（${Math.round((d.c / total) * 100)}%）`}
                  >
                    <span className="w-6 shrink-0 text-right text-xs text-ink-muted">
                      {d.n}★
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-duck-400 transition-all"
                        style={{ width: `${(d.c / total) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 shrink-0 text-xs tabular-nums text-ink-muted">
                      {d.c || ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                評價還太少，先看下面的內容比較準。
                <span className="block text-xs text-ink-muted">
                  滿 3 則之後這裡會顯示星等分佈。
                </span>
              </p>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {reviews.map((r, i) => (
              <div
                key={r.id}
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                className="card animate-rise p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={r.rater_name}
                    seed={r.rater_id}
                    url={r.rater_avatar}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{r.rater_name}</p>
                    <StarRow rating={r.rating} />
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">{when(r.created_at)}</span>
                </div>
                {r.comment && (
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                    {r.comment}
                  </p>
                )}
                <ReviewReply
                  reviewId={r.id}
                  existing={replies[r.id] ?? null}
                  canReplyAs={canReplyAs}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
