import type { Metadata } from 'next';

/**
 * 鴨窩是登入後的個人區域。robots.txt 已經擋了爬取，這裡再補 noindex ——
 * 只擋爬取的話，Google 仍可能憑外部連結把網址收錄進去（只是沒有內容）。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
