import type { Metadata } from 'next';

/** 私訊內容不進搜尋引擎，理由同 me/layout.tsx。 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
