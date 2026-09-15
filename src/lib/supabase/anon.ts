import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * 不帶 cookie 的唯讀 client，給 sitemap 與 generateMetadata 用。
 *
 * 走 supabaseServer() 會碰 cookies()，那是 request-time API，
 * 會讓 sitemap 這種本來可以被快取的 route 變成每次都重算。
 * 這裡只讀 RLS 已公開的資料，不需要登入身分。
 */
export function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
