/**
 * 用 anon/publishable key 看目前資料庫的公開資料。
 *   node scripts/peek.mjs
 *
 * 注意：這支腳本「沒有登入」，看到的就是路人看得到的東西。
 * contacts 讀不到才是正確的（RLS 生效）。
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const line = (s = '') => console.log(s);
const rule = () => line('─'.repeat(56));

line('\n  有空鴨 · 資料庫現況（以未登入路人的視角）');
rule();

const { data: profiles, error: pe } = await sb
  .from('profiles')
  .select('id, display_name, city, district, rating_avg, rating_count, created_at')
  .order('created_at');

if (pe) {
  line(`  profiles 讀取失敗：${pe.message}`);
} else if (!profiles.length) {
  line('  profiles: 空的 —— 還沒有人註冊，或觸發器沒建 profile');
} else {
  line(`  profiles (${profiles.length})`);
  for (const p of profiles) {
    line(
      `    · ${p.display_name}  ${p.city ?? '未填地區'}${p.district ?? ''}` +
        `  ★${p.rating_avg}(${p.rating_count})  ${p.id.slice(0, 8)}…`,
    );
  }
}

rule();
for (const [t, label] of [
  ['services', '服務項目'],
  ['availabilities', '空閒時段'],
  ['jobs', '工作'],
  ['invites', '邀約'],
  ['applications', '應徵'],
]) {
  const { count } = await sb.from(t).select('*', { head: true, count: 'exact' });
  line(`  ${label.padEnd(6, '　')} ${count ?? 0}`);
}

rule();
const { data: contacts } = await sb.from('contacts').select('user_id');
line(
  contacts?.length
    ? `  ⚠ contacts 未登入撈到 ${contacts.length} 筆 —— RLS 破了！`
    : '  ✓ contacts 未登入讀不到（RLS 正確擋住聯絡方式）',
);
line();
