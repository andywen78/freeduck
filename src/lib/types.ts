export type RateUnit = 'hourly' | 'daily' | 'negotiable';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  email?: string | null;
};

export type Service = {
  id: string;
  user_id: string;
  category_id: string;
  title: string | null;
  rate: number | null;
  rate_unit: RateUnit;
  note: string | null;
  is_active: boolean;
};

export type Availability = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'open' | 'booked';
  /** DB generated column：結束時間（UTC，不帶時區） */
  ends_at_utc?: string;
};

export type Job = {
  id: string;
  employer_id: string;
  category_id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  city: string;
  district: string;
  address_note: string | null;
  rate: number | null;
  rate_unit: RateUnit;
  headcount: number;
  status: 'open' | 'filled' | 'closed';
  created_at: string;
};

/** search_workers RPC 回傳的一列：一個人 × 一個空閒時段 + 他符合條件的服務。 */
export type WorkerHit = {
  worker_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  rating_avg: number;
  rating_count: number;
  availability_id: string;
  avail_date: string;
  start_time: string;
  end_time: string;
  services: Pick<Service, 'id' | 'category_id' | 'title' | 'rate' | 'rate_unit' | 'note'>[] | null;
};

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  hourly: '時薪',
  daily: '日薪',
  negotiable: '面議',
};

/** 「$220/hr」「$1,800/日」「面議」 */
export function formatRate(rate: number | null, unit: RateUnit): string {
  if (unit === 'negotiable' || rate == null) return '面議';
  const n = rate.toLocaleString('zh-TW');
  return unit === 'daily' ? `$${n}/日` : `$${n}/hr`;
}

/** 「14:00」— 把 DB 的 time 欄位（14:00:00）裁成顯示用 */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 「8/30（六）」 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}（${wd}）`;
}

/** 本地時區的 YYYY-MM-DD（不要用 toISOString，會被 UTC 位移咬到） */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 給 ends_at_utc（timestamp without time zone，內容是 UTC）比對用。
 * 不能直接送 toISOString()，尾巴的 Z 在無時區欄位上會被誤判。
 */
export function utcNowNaive(): string {
  return new Date().toISOString().slice(0, 19);
}
