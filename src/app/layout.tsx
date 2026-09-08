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

const noto = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: '有空鴨 — 有空啊？把你的空檔擺出來',
  description:
    '不是求職網。你把有空的時段和能做的事擺上來，缺人的店家、攤販、家長直接來預約。家教、遛狗、到府清潔、顧小孩、擺攤幫手，一人多技能各自報價。',
  keywords: ['打工', '兼職', '短期工作', '家教', '遛狗', '到府清潔', '零工', '接案'],
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
        {/* 冷啟動期間要分辨「沒人來」和「來了但沒註冊」，這兩件事的解法完全不同 */}
        <Analytics />
      </body>
    </html>
  );
}
