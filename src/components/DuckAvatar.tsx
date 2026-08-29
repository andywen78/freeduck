/**
 * 依 user id 決定性生成的鴨子頭像。
 *
 * 同一個人永遠拿到同一隻鴨，不同人幾乎不會撞。
 * 8 底色 × 5 身體色 × 3 嘴色 × 6 配件 × 4 眼睛 ≒ 2,880 種組合，
 * 而且完全不需要儲存空間或上傳流程。
 */

const BG: [string, string][] = [
  ['#FFE0D5', '#FFB49B'],
  ['#FFF0C9', '#FFD470'],
  ['#D9F2E3', '#9FE0BC'],
  ['#DCEBFE', '#A8CDFA'],
  ['#EBDDFB', '#CDB4F6'],
  ['#FFDDE6', '#FFB6CC'],
  ['#E6EFDB', '#C2DBA8'],
  ['#FDE3CF', '#F8C089'],
];

const BODY = ['#FFFFFF', '#FFF7EA', '#FFE9A8', '#EADCC7', '#E3E7EB'];
const BILL = ['#FF9F43', '#FFB627', '#EF8438'];
const ACCENT = ['#ED4F2B', '#2E7D8F', '#7C4DBE', '#3F8F4E', '#C2410C'];

/** 從 seed 取出一串互不相關的整數 */
function hashes(seed: string): number[] {
  let h1 = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
  }
  const out: number[] = [];
  let x = h1 >>> 0;
  for (let i = 0; i < 6; i++) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out.push(x);
  }
  return out;
}

export function DuckAvatar({ seed, size = 48 }: { seed: string; size?: number }) {
  const [h0, h1, h2, h3, h4] = hashes(seed || 'duck');

  const [bgA, bgB] = BG[h0 % BG.length];
  const body = BODY[h1 % BODY.length];
  const bill = BILL[h2 % BILL.length];
  const accent = ACCENT[h3 % ACCENT.length];
  const accessory = h3 % 6; // 0 = 沒有配件
  const eyes = h4 % 4;

  // 同一頁會有很多顆頭像，漸層 id 不能撞（撞到的話會共用別人的底色）
  const gid = `d${h0.toString(36)}${h1.toString(36)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="shrink-0 rounded-full"
      role="img"
      aria-label="頭像"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="48">
          <stop stopColor={bgA} />
          <stop offset="1" stopColor={bgB} />
        </linearGradient>
      </defs>

      <rect width="48" height="48" fill={`url(#${gid})`} />

      {/* 身體（底部露出一點） */}
      <ellipse cx="24" cy="47" rx="14" ry="10" fill={body} opacity="0.92" />

      {/* 頭 */}
      <circle cx="24" cy="25" r="13" fill={body} />

      {/* 頭頂呆毛 */}
      <path
        d="M24 12c0-2.6 1.2-4.2 3-4.6-.6 1.9-.2 3.2 1 4.2"
        fill="none"
        stroke={body}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 嘴 */}
      <ellipse cx="24" cy="30.5" rx="6" ry="3.6" fill={bill} />
      <path d="M18.4 30.6h11.2" stroke="#00000018" strokeWidth="1" strokeLinecap="round" />

      {/* 腮紅 */}
      <ellipse cx="14.5" cy="27.5" rx="2.6" ry="1.7" fill="#FF8A7A" opacity="0.35" />
      <ellipse cx="33.5" cy="27.5" rx="2.6" ry="1.7" fill="#FF8A7A" opacity="0.35" />

      {/* 眼睛 */}
      {eyes === 0 && (
        <>
          <circle cx="19" cy="23" r="1.9" fill="#1C1917" />
          <circle cx="29" cy="23" r="1.9" fill="#1C1917" />
        </>
      )}
      {eyes === 1 && (
        <>
          <path d="M17.2 23.4q1.8-2.2 3.6 0" stroke="#1C1917" strokeWidth="1.8"
                fill="none" strokeLinecap="round" />
          <path d="M27.2 23.4q1.8-2.2 3.6 0" stroke="#1C1917" strokeWidth="1.8"
                fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === 2 && (
        <>
          <circle cx="19" cy="23" r="1.9" fill="#1C1917" />
          <path d="M27.2 23.2q1.8-2 3.6 0" stroke="#1C1917" strokeWidth="1.8"
                fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === 3 && (
        <>
          <circle cx="19" cy="23" r="2.3" fill="#1C1917" />
          <circle cx="29" cy="23" r="2.3" fill="#1C1917" />
          <circle cx="19.8" cy="22.2" r="0.8" fill="#fff" />
          <circle cx="29.8" cy="22.2" r="0.8" fill="#fff" />
        </>
      )}

      {/* 配件 */}
      {accessory === 1 && ( // 鴨舌帽
        <>
          <path d="M12.5 18.5a11.5 11.5 0 0 1 23 0z" fill={accent} />
          <path d="M35 18.5h6.5a2 2 0 0 1 0 3.4H35z" fill={accent} opacity="0.85" />
        </>
      )}
      {accessory === 2 && ( // 眼鏡
        <>
          <circle cx="19" cy="23" r="4.2" fill="none" stroke={accent} strokeWidth="1.5" />
          <circle cx="29" cy="23" r="4.2" fill="none" stroke={accent} strokeWidth="1.5" />
          <path d="M23.2 23h1.6" stroke={accent} strokeWidth="1.5" />
        </>
      )}
      {accessory === 3 && ( // 圍巾
        <>
          <path d="M13 35.5q11 5 22 0v3.5q-11 4.5-22 0z" fill={accent} />
          <path d="M31.5 38.5l2.5 7 3.5-1.5-3-6.5z" fill={accent} opacity="0.85" />
        </>
      )}
      {accessory === 4 && ( // 耳機
        <>
          <path d="M11.5 25a12.5 12.5 0 0 1 25 0" fill="none" stroke={accent} strokeWidth="2" />
          <rect x="8.5" y="23" width="5.5" height="8" rx="2.6" fill={accent} />
          <rect x="34" y="23" width="5.5" height="8" rx="2.6" fill={accent} />
        </>
      )}
      {accessory === 5 && ( // 蝴蝶結（貼在頭右上，不能浮在外面）
        <>
          <path d="M29.5 15l-4.2-2.6v5.2z" fill={accent} />
          <path d="M29.5 15l4.2-2.6v5.2z" fill={accent} />
          <circle cx="29.5" cy="15" r="1.3" fill={accent} />
        </>
      )}
    </svg>
  );
}
