/**
 * 公佈欄便條：圖釘或膠帶固定、微微歪斜。首頁與找人頁共用。
 */
export type NoteColor =
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'white'
  | 'green'
  | 'orange'
  | 'lavender'
  | 'kraft';

export const NOTE_BG: Record<NoteColor, string> = {
  yellow: 'bg-note-yellow',
  pink: 'bg-note-pink',
  blue: 'bg-note-blue',
  white: 'bg-surface',
  green: 'bg-note-green',
  orange: 'bg-note-orange',
  lavender: 'bg-note-lavender',
  kraft: 'bg-note-kraft',
};

export function Note({
  className = '',
  tilt,
  fix,
  children,
}: {
  className?: string;
  tilt: number;
  fix: 'pin' | 'tape';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative shadow-[2px_4px_8px_rgb(40_25_10/0.35)] ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {fix === 'pin' ? (
        <span
          aria-hidden
          className="absolute -top-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full shadow-[1px_2px_2px_rgb(0_0_0/0.4)]"
          style={{ background: 'radial-gradient(circle at 35% 35%, #ff8a7a, #c4271b 70%)' }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 bg-white/55 shadow-sm"
        />
      )}
      {children}
    </div>
  );
}
