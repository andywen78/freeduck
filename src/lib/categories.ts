/**
 * 服務分類。id 存進 DB（services.category_id / jobs.category_id），
 * 這份檔案是唯一的顯示名稱來源。
 *
 * `featured` 標記的類別會在首頁被突顯 —— 它們是 104／小雞上工
 * 服務不到的「個人雇主」場景，也是本站冷啟動要先做起密度的地方。
 *
 * 冷啟動策略：featured 只鎖「單一垂直」。同一個供給者可以同時開同垂直的
 * 多項服務，所以集中在一個垂直時，招 10 個人就填得滿三格；分散在五個
 * 垂直則每格都只有兩三個人，點進去像沒人。目前鎖寵物，密度做起來再展開。
 */
export type Category = {
  id: string;
  name: string;
  group: string;
  emoji: string;
  featured?: boolean;
};

export const CATEGORIES: Category[] = [
  // 教學陪伴
  { id: 'tutor', name: '家教', group: '教學陪伴', emoji: '📚' },
  { id: 'talent_class', name: '才藝教學', group: '教學陪伴', emoji: '🎨' },
  { id: 'language', name: '語言陪練', group: '教學陪伴', emoji: '🗣️' },
  { id: 'homework', name: '課後輔導', group: '教學陪伴', emoji: '✏️' },
  { id: 'tech_help', name: '手機3C教學', group: '教學陪伴', emoji: '📱' },

  // 居家服務
  { id: 'cleaning', name: '到府清潔', group: '居家服務', emoji: '🧹' },
  { id: 'laundry', name: '洗衣整理', group: '居家服務', emoji: '🧺' },
  { id: 'handyman', name: '居家修繕', group: '居家服務', emoji: '🔧' },
  { id: 'declutter', name: '收納斷捨離', group: '居家服務', emoji: '📦' },
  { id: 'trash', name: '代倒垃圾', group: '居家服務', emoji: '🗑️' },
  { id: 'wait_home', name: '在家等師傅', group: '居家服務', emoji: '🚪' },

  // 照護陪伴
  { id: 'babysit', name: '顧小孩', group: '照護陪伴', emoji: '🍼' },
  { id: 'elder_care', name: '陪伴長者', group: '照護陪伴', emoji: '🧓' },
  { id: 'hospital', name: '陪同就醫', group: '照護陪伴', emoji: '🏥' },
  { id: 'postpartum', name: '月嫂幫手', group: '照護陪伴', emoji: '👶' },

  // 生活陪伴
  { id: 'shopping', name: '陪逛街', group: '生活陪伴', emoji: '🛍️' },
  { id: 'dining', name: '陪吃飯', group: '生活陪伴', emoji: '🍜' },
  { id: 'workout', name: '陪運動', group: '生活陪伴', emoji: '🏃' },
  { id: 'queue', name: '代排隊', group: '生活陪伴', emoji: '🎫' },
  { id: 'exhibit', name: '陪看展', group: '生活陪伴', emoji: '🖼️' },
  { id: 'errand', name: '陪同辦事', group: '生活陪伴', emoji: '📝' },
  { id: 'errand_buy', name: '代買跑腿', group: '生活陪伴', emoji: '🛒' },

  // 寵物服務
  { id: 'dog_walk', name: '遛狗', group: '寵物服務', emoji: '🐕', featured: true },
  { id: 'pet_sit', name: '寵物保母', group: '寵物服務', emoji: '🐈', featured: true },
  { id: 'pet_groom', name: '寵物美容助手', group: '寵物服務', emoji: '✂️' },
  { id: 'pet_drive', name: '寵物接送', group: '寵物服務', emoji: '🚗', featured: true },

  // 餐飲門市
  { id: 'foh', name: '餐飲外場', group: '餐飲門市', emoji: '🍽️' },
  { id: 'boh', name: '內場備料', group: '餐飲門市', emoji: '🔪' },
  { id: 'drinks', name: '飲料店', group: '餐飲門市', emoji: '🧋' },
  { id: 'cashier', name: '門市收銀', group: '餐飲門市', emoji: '🏪' },

  // 活動人力
  { id: 'event_staff', name: '活動工讀', group: '活動人力', emoji: '🎪' },
  { id: 'reception', name: '展場接待', group: '活動人力', emoji: '🎟️' },
  { id: 'flyer', name: '發傳單', group: '活動人力', emoji: '📄' },
  { id: 'stall', name: '擺攤幫手', group: '活動人力', emoji: '🍢' },

  // 搬運物流
  { id: 'moving', name: '搬家幫手', group: '搬運物流', emoji: '📦' },
  { id: 'carry', name: '貨物搬運', group: '搬運物流', emoji: '💪' },
  { id: 'delivery', name: '外送跑腿', group: '搬運物流', emoji: '🛵' },
  { id: 'warehouse', name: '倉儲理貨', group: '搬運物流', emoji: '🏭' },
  { id: 'parcel', name: '代領包裹', group: '搬運物流', emoji: '📮' },

  // 專業接案
  { id: 'photo', name: '攝影錄影', group: '專業接案', emoji: '📷' },
  { id: 'video_edit', name: '影片剪輯', group: '專業接案', emoji: '🎬' },
  { id: 'design', name: '平面設計', group: '專業接案', emoji: '🖌️' },
  { id: 'social', name: '社群小編', group: '專業接案', emoji: '💬' },
  { id: 'translate', name: '翻譯', group: '專業接案', emoji: '🌏' },
];

export const CATEGORY_GROUPS = Array.from(new Set(CATEGORIES.map((c) => c.group)));

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryOf(id: string | null | undefined): Category | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function categoryLabel(id: string | null | undefined): string {
  const c = categoryOf(id);
  return c ? `${c.emoji} ${c.name}` : '其他';
}

export const FEATURED = CATEGORIES.filter((c) => c.featured);
