'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { useNotifications, type Badges } from './Notifications';

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** 這個分頁要顯示哪些未讀數的總和 */
  badge?: (b: Badges) => number;
};

function Dot({ n, small = false }: { n: number; small?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      className={`absolute grid min-w-[18px] place-items-center rounded-full bg-brand-500 px-1
        font-bold text-white ring-2 ring-cream ${
          small ? '-right-2 -top-1 h-[18px] text-[10px]' : '-right-3 -top-1 h-[18px] text-[10px]'
        }`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d={d} />
  </svg>
);

const ITEMS: Item[] = [
  { href: '/discover', label: '找人', icon: I('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75') },
  { href: '/jobs', label: '找工作', icon: I('M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16') },
  {
    href: '/chat',
    label: '訊息',
    icon: I('M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z'),
    badge: (b) => b.messages,
  },
  {
    href: '/me',
    label: '鴨窩',
    icon: I('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'),
    badge: (b) => b.invites + b.applications + b.contact_requests + b.reviews,
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export function TopBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { badges } = useNotifications();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="transition-transform hover:scale-[1.03]">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`relative rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                isActive(pathname, it.href)
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-ink-soft hover:bg-brand-50/60 hover:text-ink'
              }`}
            >
              {it.label}
              {it.badge && <Dot n={it.badge(badges)} small />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Link href="/me" className="btn-ghost !px-4 !py-2">
              鴨窩
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-semibold text-ink-soft hover:text-ink sm:block">
                登入
              </Link>
              <Link href="/signup" className="btn-primary !px-4 !py-2">
                免費加入
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const { badges } = useNotifications();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md">
        {ITEMS.map((it) => {
          const on = isActive(pathname, it.href);
          const n = it.badge?.(badges) ?? 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                on ? 'text-brand-600' : 'text-ink-muted'
              }`}
            >
              <span
                className={`relative ${on ? 'scale-110 transition-transform' : 'transition-transform'}`}
              >
                {it.icon}
                <Dot n={n} />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
