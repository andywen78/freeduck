'use client';

import { useEffect } from 'react';

/**
 * 手機是底部彈出的 sheet，桌機是置中對話框。
 * 重點：背景不透明 + 有遮罩，不會跟底下的內容疊在一起看不清楚。
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // 開著的時候鎖住背景捲動
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative flex max-h-[88dvh] w-full flex-col
                   rounded-t-3xl bg-surface shadow-[0_-8px_40px_-8px_rgb(28_25_23/0.35)]
                   sm:max-w-md sm:rounded-3xl sm:shadow-[0_20px_60px_-12px_rgb(28_25_23/0.4)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-black tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full
                       text-xl leading-none text-ink-muted transition hover:bg-cream hover:text-ink"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
