'use client';

import { useState } from 'react';

const WORDS = ['', '很差', '不太好', '普通', '不錯', '非常好'];

export function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} 顆星`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onClick={() => onChange(n)}
            className={`text-3xl leading-none transition-transform duration-100 ${
              n <= shown ? 'text-duck-400' : 'text-line-strong'
            } ${n <= shown ? 'scale-110' : ''} hover:scale-125`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-ink-soft">{WORDS[shown]}</span>
      </div>
    </div>
  );
}

/** 只讀的星等顯示 */
export function StarRow({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} 顆星`} className="text-sm tracking-tight">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'text-duck-400' : 'text-line-strong'}>
          ★
        </span>
      ))}
    </span>
  );
}
