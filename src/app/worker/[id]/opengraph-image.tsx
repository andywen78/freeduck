import { ImageResponse } from 'next/og';
import { categoryOf } from '@/lib/categories';
import { clip, OG_COLORS as C, OG_SIZE, ogFallback, ogFonts } from '@/lib/og';
import { SITE_URL } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { supabaseAnon } from '@/lib/supabase/anon';
import { formatDate, formatRate, hhmm, utcNowNaive } from '@/lib/types';

export const alt = '有空鴨 — 這個人的空檔、服務與報價';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** 空檔會變，但不必分秒精準；一小時重算一次省下大量字型請求。 */
export const revalidate = 3600;

/**
 * 人物頁的分享卡。
 *
 * 供給者把自己的頁面貼進 FB 社團／Threads 時，卡片就是第一印象 —— 全站通用
 * 那張圖看不出是誰、做什麼、多少錢，等於白貼。這裡把「誰、在哪、能做什麼、
 * 多少錢、什麼時候有空」直接畫進去。
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured) return ogFallback(SITE_URL);

  const supabase = supabaseAnon();
  const nowUtc = utcNowNaive();

  const [prof, svc, avail] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, city, district, rating_avg, rating_count, status')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('services')
      .select('category_id, rate, rate_unit')
      .eq('user_id', id)
      .eq('is_active', true),
    supabase
      .from('availabilities')
      .select('date, start_time, end_time')
      .eq('user_id', id)
      .eq('status', 'open')
      .gt('ends_at_utc', nowUtc)
      .order('date')
      .order('start_time')
      .limit(20),
  ]);

  const p = prof.data as {
    display_name: string;
    city: string | null;
    district: string | null;
    rating_avg: number;
    rating_count: number;
    status?: string;
  } | null;

  // 找不到人或帳號停權，就別用漂亮卡片幫它在社群上背書
  if (!p || (p.status && p.status !== 'active')) return ogFallback(SITE_URL);

  const services = (svc.data ?? []) as { category_id: string; rate: number | null; rate_unit: 'hourly' | 'daily' | 'negotiable' }[];
  const slots = (avail.data ?? []) as { date: string; start_time: string; end_time: string }[];

  const name = clip(p.display_name, 12);
  const where = [p.city, p.district].filter(Boolean).join('') || '台灣';
  const rating = p.rating_count > 0 ? `★ ${p.rating_avg.toFixed(1)}（${p.rating_count}）` : '';

  const chips = services
    .slice(0, 3)
    .map((s) => `${categoryOf(s.category_id)?.name ?? '服務'} ${formatRate(s.rate, s.rate_unit)}`);
  const more = services.length > 3 ? `＋${services.length - 3} 項` : '';

  // 時段一行排不下（中文字＋時間很快就爆版），改成一段一行
  const whenLines = slots.length
    ? slots.slice(0, 2).map((s) => `${formatDate(s.date)} ${hhmm(s.start_time)}–${hhmm(s.end_time)}`)
    : ['目前沒有開放的時段'];
  // 標籤跟「還有幾段」擠同一行，630px 的高度沒有多餘的行可以浪費
  const whenLabel = slots.length
    ? `最近有空${slots.length > 2 ? `　·　還有 ${slots.length - 2} 個時段` : ''}`
    : '';

  // 沒有任何空檔的人，卡片不能喊「直接預約」——點進去會撲空
  const footer = slots.length ? '點開看完整空檔，直接線上預約' : '來有空鴨，找有空的人';

  // 字型子集只含這張卡實際印出的字，所以要先把文字全部組完再去換字型
  let fonts;
  try {
    fonts = await ogFonts(
      ['鴨', '有空鴨', 'freeduck.tw', name, where, rating, ...chips, more, whenLabel, ...whenLines, footer].join(''),
    );
  } catch {
    return ogFallback(SITE_URL);
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: 48,
          background: C.cream,
          fontFamily: 'Noto Sans TC',
          color: C.ink,
        }}
      >
        {/* 品牌列 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 20,
              background: C.brand600,
              color: '#fff',
              fontSize: 36,
              fontWeight: 900,
            }}
          >
            鴨
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, lineHeight: 1.3, fontWeight: 900 }}>有空鴨</div>
            <div style={{ fontSize: 20, lineHeight: 1.3, color: C.inkMuted }}>freeduck.tw</div>
          </div>
        </div>

        {/*
          主卡。satori 沒有溢位保護：內容一旦高過卡片，justify-center 會讓它
          往上下兩邊擠出去、直接壓到別行。所以這裡靠上排列＋overflow hidden，
          最壞情況是最後一行被切掉，而不是整張卡疊在一起。
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            marginTop: 24,
            padding: 36,
            background: C.surface,
            border: `3px solid ${C.line}`,
            borderRadius: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.2, letterSpacing: -2 }}>
              {name}
            </div>
            {rating && <div style={{ fontSize: 28, color: C.duck400, fontWeight: 900 }}>{rating}</div>}
          </div>

          <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.4, color: C.inkSoft }}>{where}</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            {chips.map((c) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  padding: '10px 24px',
                  borderRadius: 999,
                  background: C.brand50,
                  color: C.brand700,
                  fontSize: 26,
                  lineHeight: 1.2,
                  fontWeight: 900,
                }}
              >
                {c}
              </div>
            ))}
            {more && (
              <div
                style={{
                  display: 'flex',
                  padding: '10px 6px',
                  fontSize: 26,
                  lineHeight: 1.2,
                  color: C.inkMuted,
                }}
              >
                {more}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
            {whenLabel && (
              <div style={{ display: 'flex', fontSize: 22, lineHeight: 1.5, color: C.inkMuted }}>
                {whenLabel}
              </div>
            )}
            {whenLines.map((l) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: C.inkSoft,
                  fontWeight: 900,
                }}
              >
                {clip(l, 26)}
              </div>
            ))}
          </div>
        </div>

        {/* 行動呼籲 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 22,
            fontSize: 26,
            lineHeight: 1.4,
            fontWeight: 900,
            color: C.brand600,
          }}
        >
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 999, background: C.brand500 }} />
          {footer}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
