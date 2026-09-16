/**
 * 動態分享卡（OG image）共用的字型與顏色。
 *
 * 卡片全是中文，而 satori 不內建任何 CJK 字型 —— 不餵字型進去會整片豆腐格。
 * 完整的 Noto Sans TC 有好幾 MB，塞進 ImageResponse 會超時，所以走 Google Fonts
 * 的 `text=` 子集端點：只要這張卡片實際用到的那幾十個字。做法是先把整張卡的
 * 文字組完，再拿去換字型，順序不能反。
 *
 * 另外 satori 只吃 TTF/OTF/WOFF，不吃 WOFF2。css2 端點對「看起來很舊」的
 * User-Agent 會回 truetype，所以這裡刻意不送現代瀏覽器的 UA。
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** 跟 globals.css 的 CSS 變數對齊，satori 讀不到 Tailwind 所以得抄一份。 */
export const OG_COLORS = {
  brand50: '#fff1ec',
  brand500: '#ff6b4a',
  brand600: '#ed4f2b',
  brand700: '#c73c1c',
  duck400: '#ffc145',
  ink: '#1c1917',
  inkSoft: '#57534e',
  inkMuted: '#8b8178',
  cream: '#fff8f3',
  surface: '#ffffff',
  line: '#f1e2d7',
};

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: 'normal';
};

/** 取一個「剛好夠印出 text」的 Noto Sans TC 子集。 */
async function subset(text: string, weight: 400 | 700 | 900): Promise<OgFont> {
  const chars = Array.from(new Set(Array.from(text))).join('');
  const url =
    `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}` +
    `&text=${encodeURIComponent(chars)}`;

  const css = await fetch(url, { headers: { 'User-Agent': 'FreeDuckOG/1.0' } }).then((r) => r.text());
  const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!src) throw new Error('Google Fonts 沒回傳可用的字型網址');

  const data = await fetch(src).then((r) => r.arrayBuffer());
  return { name: 'Noto Sans TC', data, weight, style: 'normal' };
}

/** 卡片要用的粗細一次抓齊；任何一個掛掉就整批算失敗，交給呼叫端退回靜態圖。 */
export function ogFonts(text: string): Promise<OgFont[]> {
  return Promise.all([subset(text, 400), subset(text, 900)]);
}

/**
 * 產卡片失敗時的退路：回全站那張靜態 OG 圖。
 * 比回 500 好 —— 500 會讓 FB／LINE 的卡片整個消失，連品牌都露不到。
 */
export async function ogFallback(siteUrl: string): Promise<Response> {
  const res = await fetch(`${siteUrl}/opengraph-image.png`);
  return new Response(await res.arrayBuffer(), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' },
  });
}

/** 超過 max 就截斷加省略號——satori 的 text-overflow 不可靠，先在 JS 切乾淨。 */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
