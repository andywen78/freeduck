import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * 信件連結的落地點。
 *
 * 點確認信 → Supabase 驗證 token → 帶著 ?code= 導到這裡 → 換成 session → 進鴨窩。
 * 沒有這一關的話，使用者點完確認信只會回到首頁，還是登出狀態。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/me';

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // PKCE 的 code_verifier 存在瀏覽器裡，換瀏覽器開連結就會失敗
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  return response;
}
