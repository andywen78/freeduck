import type { Metadata } from 'next';
import Link from 'next/link';
import { SlotValue } from '@/components/SlotValue';
import { clampDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: '你的空檔值多少',
  description: clampDescription(
    '點出你一週通常有空的時段，算算這些時間如果拿來做你會的事，一個月大概能多賺多少。遛狗、家教、到府清潔的參考行情都在這裡。',
  ),
  alternates: { canonical: '/how-much' },
  openGraph: {
    type: 'website',
    url: '/how-much',
    title: '你的空檔值多少｜有空鴨',
    description: '一週幾個小時是空的？算算看它值多少。',
  },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <header>
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          你一週有幾個小時
          <br />
          其實是空的？
        </h1>
        <p className="mt-3 text-ink-soft">
          大部分人都低估了自己的空檔。點完下面的格子，你會看到一個有點嚇人的數字。
        </p>
      </header>

      <SlotValue />

      <footer className="border-t border-line pt-6 text-sm text-ink-soft">
        <p>
          這裡的金額都是參考區間的偏低處，實際要看經驗、地區跟當下的需求。
          想看各項服務的完整行情，去{' '}
          <Link href="/rates" className="font-semibold text-brand-600 underline">
            行情參考
          </Link>
          。
        </p>
      </footer>
    </div>
  );
}
