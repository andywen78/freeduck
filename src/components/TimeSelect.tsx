'use client';

/**
 * 15 分鐘刻度的時間選擇器，固定 24 小時制。
 *
 * 為什麼不用 <input type="time">：它的「值」永遠是 24 小時制（14:00），
 * 但「顯示」由瀏覽器／作業系統的地區設定決定。台灣使用者的 Chrome 會把
 * 下午一點畫成「01:00 下午」，滑動選單上更常只看得到 01:00 —— 存進去的
 * 資料是對的，人看到的是錯的，這種誤會在「約時間見面」的產品上代價很高。
 *
 * 改用 select 之後顯示完全由我們控制，行動裝置上也不用跟原生時間轉盤搏鬥。
 */
const SLOTS: string[] = [];
for (let h = 0; h < 24; h += 1) {
  for (const m of [0, 15, 30, 45]) {
    SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export function TimeSelect({
  value,
  onChange,
  emptyLabel,
  className = 'field',
}: {
  value: string;
  onChange: (v: string) => void;
  /** 可以「不限」的地方（例如搜尋篩選）傳入文字，會多一個空值選項 */
  emptyLabel?: string;
  className?: string;
}) {
  // 資料庫裡若有不在 15 分刻度上的舊值，保留它才不會在編輯時被悄悄改掉
  const extra = value && !SLOTS.includes(value) ? value : null;

  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {extra && <option value={extra}>{extra}</option>}
      {SLOTS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
