/**
 * 服務行情參考值。
 *
 * 站上目前的真實報價太少（而且多半是「面議」），不足以算出可信的中位數，
 * 所以這裡先用公開來源的區間當參考，每一筆都標出處 —— 寧可說「這是別人的
 * 統計」，也不要讓人以為是平台自己的數據。
 *
 * 等某個分類的真實報價累積到 MIN_SAMPLES 筆以上，行情頁會改用平台自己的
 * 中位數，那才是別人抄不走的東西。
 */

/** 分類的真實報價累積到幾筆，才夠格取代參考值 */
export const MIN_SAMPLES = 12;

/** 2026 年最低工資（勞動部公告，115/01/01 起） */
export const MIN_WAGE = {
  hourly: 196,
  monthly: 29_500,
  source: '勞動部公告',
  sourceUrl: 'https://www.mol.gov.tw/1607/1632/1633/87257/post',
} as const;

export type RateUnitRef = 'hourly' | 'per_visit' | 'daily';

export type RateRef = {
  /** 對應 categories.ts 的 id */
  category: string;
  unit: RateUnitRef;
  low: number;
  high: number;
  /** 拿來試算的值。刻意取區間偏低處 —— 算出來的錢寧可少，不要讓人期待落空 */
  typical: number;
  /** 一次服務大概多久（小時）。hourly 的就是 1 */
  hours: number;
  note?: string;
  source: string;
  official?: boolean;
};

export const UNIT_LABEL: Record<RateUnitRef, string> = {
  hourly: '小時',
  per_visit: '次',
  daily: '日',
};

export const RATES: RateRef[] = [
  // 寵物（冷啟動主打的垂直，資料最齊）
  {
    category: 'dog_walk', unit: 'per_visit', low: 200, high: 400, typical: 250, hours: 1,
    note: '一次約 30～60 分鐘，大型犬通常往上加',
    source: '毛孩生活誌 2026 狗狗保母費用整理（非官方）',
  },
  {
    category: 'pet_sit', unit: 'per_visit', low: 400, high: 800, typical: 500, hours: 2,
    note: '到府餵食、清貓砂、陪玩；過夜另計 800～1,500／晚',
    source: '毛孩生活誌 2026 寵物保母費用整理（非官方）',
  },
  {
    category: 'pet_drive', unit: 'per_visit', low: 300, high: 600, typical: 350, hours: 1.5,
    note: '看距離與是否需要等候',
    source: '寵物保母平台公開牌價（非官方）',
  },

  // 居家
  {
    category: 'cleaning', unit: 'hourly', low: 250, high: 400, typical: 280, hours: 1,
    note: '到府清潔多以 2～3 小時為一單位',
    source: '家事服務平台公開牌價（非官方）',
  },
  {
    category: 'trash', unit: 'per_visit', low: 100, high: 200, typical: 120, hours: 0.5,
    source: '跑腿平台公開牌價（非官方）',
  },
  {
    category: 'wait_home', unit: 'hourly', low: 200, high: 300, typical: 220, hours: 1,
    note: '在家等維修、收貨，時間長但不費力',
    source: '跑腿平台公開牌價（非官方）',
  },

  // 教學陪伴
  {
    category: 'tutor', unit: 'hourly', low: 400, high: 800, typical: 450, hours: 1,
    note: '大學生家教多在區間下緣，科目越專業越高',
    source: '家教媒合平台公開行情（非官方）',
  },
  {
    category: 'tech_help', unit: 'hourly', low: 300, high: 600, typical: 350, hours: 1,
    note: '教長輩用手機、處理電腦問題',
    source: '同業公開牌價（非官方）',
  },

  // 照護
  {
    category: 'babysit', unit: 'hourly', low: 200, high: 350, typical: 250, hours: 1,
    note: '臨時托育；過夜或多個小孩另計',
    source: '托育媒合平台公開行情（非官方）',
  },
  {
    category: 'elder_care', unit: 'hourly', low: 250, high: 400, typical: 280, hours: 1,
    source: '居家照護平台公開牌價（非官方）',
  },

  // 活動與門市：這些多半照最低工資走，是少數有官方錨點的
  {
    category: 'event_staff', unit: 'hourly', low: 196, high: 250, typical: 200, hours: 1,
    note: `法定最低時薪 ${MIN_WAGE.hourly} 元，活動工讀多在這附近`,
    source: `最低工資 ${MIN_WAGE.source}`, official: true,
  },
  {
    category: 'stall', unit: 'hourly', low: 196, high: 250, typical: 200, hours: 1,
    note: `法定最低時薪 ${MIN_WAGE.hourly} 元`,
    source: `最低工資 ${MIN_WAGE.source}`, official: true,
  },
  {
    category: 'foh', unit: 'hourly', low: 196, high: 250, typical: 200, hours: 1,
    note: `法定最低時薪 ${MIN_WAGE.hourly} 元`,
    source: `最低工資 ${MIN_WAGE.source}`, official: true,
  },

  // 搬運
  {
    category: 'moving', unit: 'hourly', low: 300, high: 500, typical: 350, hours: 1,
    note: '需要體力，通常有最低時數',
    source: '搬家業者公開牌價（非官方）',
  },
  {
    category: 'errand_buy', unit: 'per_visit', low: 100, high: 250, typical: 150, hours: 0.5,
    source: '跑腿平台公開牌價（非官方）',
  },
];

const BY_CATEGORY = new Map(RATES.map((r) => [r.category, r]));

export function rateOf(categoryId: string): RateRef | undefined {
  return BY_CATEGORY.get(categoryId);
}

/** 「$200～400／次」 */
export function formatRange(r: RateRef): string {
  return `$${r.low.toLocaleString('zh-TW')}～${r.high.toLocaleString('zh-TW')}／${UNIT_LABEL[r.unit]}`;
}

/** 把一項服務換算成「每小時大約多少錢」，好跟其他單位的服務比較。 */
export function hourlyEquivalent(r: RateRef): number {
  return Math.round(r.typical / r.hours);
}
