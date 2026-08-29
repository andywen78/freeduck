export function DuckMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect width="40" height="40" rx="12" fill="url(#fd-grad)" />
      {/* 身體 */}
      <path
        d="M9.5 30.5c0-5.2 4.3-8.4 9.6-8.4 5.6 0 9.9 2.9 9.9 7.6 0 1.1-.2 2-.6 2.8H10.4a5 5 0 0 1-.9-2Z"
        fill="#fff"
      />
      {/* 頭 */}
      <circle cx="16.4" cy="15.8" r="6.6" fill="#fff" />
      {/* 嘴 */}
      <path d="M22.4 13.4 30 15.2l-7.4 3.1z" fill="#FFC145" />
      {/* 眼睛 */}
      <circle cx="18.4" cy="14.3" r="1.35" fill="#1C1917" />
      <defs>
        <linearGradient id="fd-grad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#FF8263" />
          <stop offset="1" stopColor="#ED4F2B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <DuckMark size={size} />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        有空鴨
      </span>
    </span>
  );
}
