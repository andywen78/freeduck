import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/** 需要登入才能進入的路徑前綴。 */
const PROTECTED = ['/me', '/chat', '/invites', '/jobs/new'];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // 尚未設定 Supabase 時不要對 placeholder 網址發請求
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // robots.txt 與 sitemap.xml 要排除：它們沒有登入狀態可言，跑這支
  // middleware 等於每次爬取都多一次 supabase.auth.getUser() 的網路往返。
  // Supabase 一慢，爬蟲就可能等到逾時，Search Console 會直接記成「無法擷取」。
  // 動態分享卡 /worker/*/opengraph-image 同理，而且它沒有副檔名，被下面的
  // 副檔名規則漏掉 —— FB、LINE 抓卡片時每次都會多跑一次 getUser()。
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*/opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
