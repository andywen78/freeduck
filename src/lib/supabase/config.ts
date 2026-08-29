/**
 * 集中判斷 Supabase 是否已設定。
 *
 * 尚未貼上金鑰時整站仍要能跑（看得到 UI、看得到示範資料），
 * 所以這裡給假的 placeholder 讓 client 不會在建構時就 throw，
 * 並用 isSupabaseConfigured 在畫面上掛設定提示。
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
