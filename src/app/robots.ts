import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * 只擋「登入後才有意義」的區域。/login 與 /signup 不擋爬取，
 * 改用頁面自己的 robots: noindex —— 擋爬取反而會讓 Google 在
 * 讀不到內容的情況下仍憑外部連結收錄該網址。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/me/', '/chat/', '/auth/', '/jobs/new', '/jobs/*/edit'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
