/**
 * 站台層級的 SEO 常數與小工具。
 *
 * 網域寫死 apex（www 會 308 導過來）—— 跟 Supabase 白名單與
 * window.location.origin 組出來的 redirect URL 保持一致，方向不能反。
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://freeduck.tw';

export const SITE_NAME = '有空鴨';

export const SITE_TAGLINE = '有空啊？把你的空檔擺出來';

export const SITE_DESCRIPTION =
  '不是求職網。你把有空的時段和能做的事擺上來，缺人的店家、攤販、家長直接來預約。家教、遛狗、到府清潔、顧小孩、擺攤幫手，一人多技能各自報價。';

/** 組出絕對網址；傳入的 path 要以 / 開頭。 */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** 頁面標題統一後綴（首頁自己帶完整標題，不走這裡）。 */
export function pageTitle(title: string): string {
  return `${title}｜${SITE_NAME}`;
}

/** 截成適合 meta description 的長度，避免被搜尋引擎砍在半途。 */
export function clampDescription(text: string, max = 150): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
