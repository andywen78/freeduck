import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { BottomBar, TopBar } from '@/components/Nav';
import { NotificationProvider } from '@/components/Notifications';
import { Footer } from '@/components/Legal';
import { SetupBanner } from '@/components/SetupBanner';
import { currentProfile } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/seo';

const noto = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-noto',
});

export const metadata: Metadata = {
  // 有了 metadataBase，各頁的 canonical 與 og:image 才組得出絕對網址
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // 子頁只要給自己的名字，後綴由這裡統一補
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['打工', '兼職', '短期工作', '家教', '遛狗', '到府清潔', '零工', '接案'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'zh_TW',
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6B4A',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = isSupabaseConfigured ? await currentProfile() : null;

  return (
    <html lang="zh-Hant-TW" className={noto.variable}>
      <body className={`${noto.className} min-h-dvh antialiased`}>
        <NotificationProvider>
          <SetupBanner />
          <TopBar signedIn={!!profile} />
          <main className="mx-auto max-w-5xl px-4 pt-6">{children}</main>
          <Footer />
          <BottomBar />
        </NotificationProvider>
        {/* 讓 Google 知道「有空鴨」是這個網域的品牌名，品牌詞才搶得回來 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${SITE_URL}/#org`,
                  name: SITE_NAME,
                  alternateName: 'FreeDuck',
                  url: SITE_URL,
                  logo: `${SITE_URL}/opengraph-image.png`,
                  description: SITE_DESCRIPTION,
                  areaServed: { '@type': 'Country', name: '台灣' },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  inLanguage: 'zh-Hant-TW',
                  publisher: { '@id': `${SITE_URL}/#org` },
                },
              ],
            }),
          }}
        />
        {/* 冷啟動期間要分辨「沒人來」和「來了但沒註冊」，這兩件事的解法完全不同 */}
        <Analytics />
      </body>
    </html>
  );
}
