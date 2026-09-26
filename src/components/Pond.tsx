'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { formatRate, hhmm, type RateUnit } from '@/lib/types';

/**
 * 鴨池：把「誰有空」畫成一池可以盯著看的水。
 *
 * 橫軸是一天的時間（06:00～24:00），每個開放的時段是一隻鴨子，浮在它自己的
 * 時間位置上。真實時間的那條線會一直往右爬，爬到誰身上誰就醒過來發光。
 *
 * 這頁的重點不是功能，是「還能看」——水一直在動，所以就算池子裡只有兩隻鴨，
 * 頁面也不會看起來像壞掉。
 */

export type PondDuck = {
  id: string;
  workerId: string;
  name: string;
  date: string;
  start: string;
  end: string;
  where: string;
  service: string | null;
  rate: number | null;
  rateUnit: RateUnit;
};

const HOUR_FROM = 6;
const HOUR_TO = 24;
const SPAN = HOUR_TO - HOUR_FROM;

/** 'HH:MM:SS' → 小時數（14:30 → 14.5） */
function toHour(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 「今天」「明天」「9/28（日）」 */
function dayLabel(iso: string, today: string): string {
  if (iso === today) return '今天';
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000,
  );
  if (diff === 1) return '明天';
  return `${m}/${d}（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
}

/** 台北現在幾點（小數小時）。伺服器在 UTC，所以不能用瀏覽器以外的時間 */
function taipeiHourNow(): number {
  const now = new Date();
  const tpe = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60_000);
  return tpe.getHours() + tpe.getMinutes() / 60 + tpe.getSeconds() / 3600;
}


/**
 * 時間線的時鐘。
 *
 * getSnapshot 每次 render 都會被呼叫並拿去比對，所以不能直接回傳
 * taipeiHourNow() —— 每次都是新數字會打成無限重繪。這裡量化到「分鐘」
 * 並快取，同一分鐘內回同一個值。
 */
let clockMinute = -1;
let clockValue = 0;

function clockSnapshot(): number {
  const h = taipeiHourNow();
  const minute = Math.floor(h * 60);
  if (minute !== clockMinute) {
    clockMinute = minute;
    clockValue = h;
  }
  return clockValue;
}

function subscribeClock(onChange: () => void): () => void {
  const t = setInterval(onChange, 20_000);
  return () => clearInterval(t);
}

export function Pond({ ducks, today }: { ducks: PondDuck[]; today: string }) {
  // 時鐘是「外部系統」，用 useSyncExternalStore 才不會在 effect 裡硬 setState
  const hour = useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
  const [active, setActive] = useState<string | null>(null);
  const [day, setDay] = useState(today);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 只顯示今天的話，冷啟動期間池子幾乎都是空的，而後面幾天的時段全被藏起來。
  // 有哪幾天就列哪幾天，讓人可以往後翻。
  const dayTabs = useMemo(() => {
    const count = new Map<string, number>();
    ducks.forEach((d) => count.set(d.date, (count.get(d.date) ?? 0) + 1));
    if (!count.has(today)) count.set(today, 0);
    return [...count.entries()]
      .filter(([date]) => date >= today)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 8)
      .map(([date, n]) => ({ date, n }));
  }, [ducks, today]);

  // 點空白處收起氣泡
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setActive(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const todays = ducks.filter((d) => d.date === day);
  const isToday = day === today;

  // 同一個時間點可能好幾隻，用序號分層錯開，不然會疊在一起
  const laneOf = (i: number) => [0.30, 0.52, 0.72, 0.41, 0.62][i % 5];

  const nowX = !isToday || hour == null ? null : clamp01((hour - HOUR_FROM) / SPAN) * 100;

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ background: 'linear-gradient(#141d2b 0%, #182436 42%, #1d2c40 100%)' }}
    >
      {/* 換日 */}
      {dayTabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {dayTabs.map((t) => (
            <button
              key={t.date}
              type="button"
              onClick={() => {
                setDay(t.date);
                setActive(null);
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                day === t.date
                  ? 'bg-white/15 text-white'
                  : 'text-white/45 hover:text-white/75'
              }`}
            >
              {dayLabel(t.date, today)}
              <span className="ml-1 font-normal opacity-70">{t.n}</span>
            </button>
          ))}
        </div>
      )}

      {/* 天空的幾顆光點，讓上半部不要空 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%]">
        {[12, 28, 47, 63, 81, 92].map((x, i) => (
          <span
            key={x}
            className="absolute rounded-full bg-white/40"
            style={{
              left: `${x}%`,
              top: `${14 + ((i * 29) % 60)}%`,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              animation: `pond-twinkle ${5 + (i % 4)}s ease-in-out ${i * 0.7}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative h-[360px] sm:h-[420px]">
        {/* 水面 */}
        <div
          className="absolute inset-x-0 bottom-0 top-[34%]"
          style={{
            background:
              'linear-gradient(#22344c 0%, #1b2b3f 55%, #16222f 100%)',
            boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.08)',
          }}
        >
          {/* 水紋：三條慢慢橫移的帶子，速度不同才不會看起來像貼圖 */}
          {[
            { top: '18%', dur: 34, opacity: 0.07 },
            { top: '46%', dur: 27, opacity: 0.055 },
            { top: '74%', dur: 41, opacity: 0.045 },
          ].map((w) => (
            <div
              key={w.top}
              className="absolute inset-x-[-50%] h-px"
              style={{
                top: w.top,
                background: `linear-gradient(90deg, transparent, rgb(255 255 255 / ${w.opacity}) 30%, rgb(255 255 255 / ${w.opacity}) 70%, transparent)`,
                animation: `pond-drift ${w.dur}s linear infinite`,
              }}
            />
          ))}
        </div>

        {/* 現在時間 */}
        {nowX != null && (
          <div
            className="pointer-events-none absolute bottom-0 top-[30%] w-px transition-[left] duration-1000"
            style={{
              left: `${nowX}%`,
              background: 'linear-gradient(transparent, #FF6B4A 22%, #FF6B4A 88%, transparent)',
              boxShadow: '0 0 12px rgb(255 107 74 / 0.75)',
            }}
          >
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-[#FF6B4A] px-2 py-0.5 text-[10px] font-bold text-white">
              現在
            </span>
          </div>
        )}

        {/* 鴨子 */}
        {todays.map((d, i) => {
          const mid = (toHour(d.start) + toHour(d.end)) / 2;
          const x = clamp01((mid - HOUR_FROM) / SPAN) * 100;
          const awake =
            isToday && hour != null && hour >= toHour(d.start) && hour < toHour(d.end);
          const open = active === d.id;

          return (
            <div
              key={d.id}
              className="absolute -translate-x-1/2"
              style={{
                left: `${x}%`,
                top: `${34 + laneOf(i) * 58}%`,
                animation: `pond-bob ${3.4 + (i % 5) * 0.45}s ease-in-out ${i * 0.31}s infinite`,
                zIndex: open ? 30 : awake ? 20 : 10,
              }}
            >
              <button
                type="button"
                onClick={() => setActive(open ? null : d.id)}
                aria-label={`${d.name} ${hhmm(d.start)}–${hhmm(d.end)}`}
                className="block cursor-pointer transition-transform hover:scale-110"
              >
                <Duck awake={awake} />
              </button>

              {open && (
                <div className="absolute bottom-full left-1/2 z-40 mb-2 w-44 -translate-x-1/2 rounded-xl bg-white p-3 text-left shadow-xl">
                  <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {hhmm(d.start)}–{hhmm(d.end)}
                    {d.where ? ` · ${d.where}` : ''}
                  </p>
                  {d.service && (
                    <p className="mt-1.5 text-xs font-semibold text-brand-600">
                      {d.service} {formatRate(d.rate, d.rateUnit)}
                    </p>
                  )}
                  <Link
                    href={`/worker/${d.workerId}`}
                    className="mt-2 block rounded-lg bg-brand-500 px-2 py-1.5 text-center text-xs font-bold text-white"
                  >
                    看他的空檔
                  </Link>
                </div>
              )}
            </div>
          );
        })}

        {/* 池子空的時候：水照樣在動，岸邊放一隻在等的鴨 */}
        {todays.length === 0 && (
          <div className="absolute inset-x-0 bottom-[16%] text-center">
            <div className="inline-block" style={{ animation: 'pond-bob 3.8s ease-in-out infinite' }}>
              <Duck awake={false} />
            </div>
            <p className="mt-4 text-sm font-semibold text-white/85">
              {dayLabel(day, today)}的池子還是空的
            </p>
            <p className="mt-1 text-xs text-white/50">你的空檔可以是第一隻</p>
          </div>
        )}

        {/* 時間刻度 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1 pb-1.5">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <span key={h} className="text-[10px] tabular-nums text-white/30">
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      {/* 池底資訊列 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        <p className="text-xs text-white/60">
          {todays.length > 0
            ? `${dayLabel(day, today)}有 ${todays.length} 個時段浮在水上`
            : `${dayLabel(day, today)}沒有人有空`}
          {ducks.length > todays.length ? ` · 其他日子還有 ${ducks.length - todays.length} 個` : ''}
        </p>
        <Link
          href="/discover"
          className="text-xs font-semibold text-[#FFC145] hover:underline"
        >
          用篩選找人 →
        </Link>
      </div>

      <style>{`
        @keyframes pond-bob {
          0%, 100% { transform: translate(-50%, 0) rotate(-3deg); }
          50%      { transform: translate(-50%, -7px) rotate(3deg); }
        }
        @keyframes pond-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(33%); }
        }
        @keyframes pond-twinkle {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pond-bob"], [style*="pond-drift"], [style*="pond-twinkle"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/** 一隻鴨。醒著的會多一圈光暈，表示他的時段正在進行中 */
function Duck({ awake }: { awake: boolean }) {
  const body = awake ? '#FFC145' : '#8C8574';
  const head = awake ? '#FFD469' : '#9A9382';

  return (
    <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden>
      {awake && <circle cx="17" cy="16" r="13" fill="#FFC145" opacity="0.18" />}
      {/* 倒影 */}
      <ellipse cx="17" cy="25.5" rx="9" ry="1.6" fill={body} opacity="0.2" />
      {/* 身體 */}
      <ellipse cx="17" cy="19" rx="10" ry="6" fill={body} />
      {/* 頭 */}
      <circle cx="23" cy="12" r="5" fill={head} />
      {/* 嘴 */}
      <path d="M27.5 12 L33 13.4 L27.5 14.8 Z" fill={awake ? '#F0A92C' : '#7C7566'} />
      {/* 眼睛 */}
      <circle cx="24.4" cy="10.9" r="1.05" fill="#141d2b" />
    </svg>
  );
}
