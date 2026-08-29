/**
 * 檢查 Supabase 是否設定正確。
 *   node scripts/verify-setup.mjs
 *
 * 用 anon key 連線，逐項驗證資料表、RPC、RLS 是否到位。
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ---------- 讀 .env.local ----------
let env = {};
try {
  env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
} catch {
  console.error('✗ 找不到 .env.local —— 先 cp .env.local.example .env.local 再填金鑰');
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || url.includes('xxxxxxxx') || key.startsWith('eyJhbGciOi...')) {
  console.error('✗ .env.local 裡的金鑰還是範本值，請貼上真正的 Supabase URL 與 anon key');
  process.exit(1);
}

const sb = createClient(url, key);
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

// ---------- 1. 連線 ----------
try {
  const { error } = await sb.from('profiles').select('id', { head: true, count: 'exact' });
  check('連線到 Supabase', !error, error?.message ?? '');
} catch (e) {
  check('連線到 Supabase', false, e.message);
}

// ---------- 2. 資料表 ----------
const TABLES = [
  'profiles',
  'contacts',
  'services',
  'availabilities',
  'jobs',
  'invites',
  'applications',
  'conversations',
  'messages',
  'reviews',
];

for (const t of TABLES) {
  const { error } = await sb.from(t).select('*', { head: true, count: 'exact' });
  // RLS 擋住讀取不算失敗（contacts 本來就該擋），只有「表不存在」才是失敗
  const missing = error && /does not exist|schema cache/i.test(error.message);
  check(`資料表 ${t}`, !missing, missing ? '不存在 —— 0001_init.sql 沒跑成功' : '');
}

// ---------- 3. 搜尋 RPC ----------
{
  const { error } = await sb.rpc('search_workers', {
    p_date: null,
    p_start: null,
    p_end: null,
    p_category: null,
    p_city: null,
    p_district: null,
  });
  check(
    'RPC search_workers（核心搜尋）',
    !error,
    error ? `${error.message} —— 0002 沒跑成功` : '',
  );
}

// ---------- 3b. 0003：聯絡方式請求與徽章 ----------
{
  const { error } = await sb.from('contact_requests').select('*', { head: true, count: 'exact' });
  const missing = error && /does not exist|schema cache/i.test(error.message);
  check('資料表 contact_requests', !missing, missing ? '不存在 —— 0003 沒跑' : '');
}
{
  const { error } = await sb.rpc('my_badges');
  check('RPC my_badges（未讀徽章）', !error, error ? `${error.message} —— 0003 沒跑` : '');
}
{
  const { error } = await sb.rpc('mark_thread_read', {
    conv: '00000000-0000-0000-0000-000000000000',
  });
  check('RPC mark_thread_read（已讀標記）', !error, error ? `${error.message} —— 0003 沒跑` : '');
}

// ---------- 3c. 0004：評價系統 ----------
{
  const { error } = await sb.rpc('pending_reviews');
  check('RPC pending_reviews（待評價清單）', !error, error ? `${error.message} —— 0004 沒跑` : '');
}
{
  const { error } = await sb.rpc('reviews_of', {
    p_user: '00000000-0000-0000-0000-000000000000',
  });
  check('RPC reviews_of（公開評價）', !error, error ? `${error.message} —— 0004 沒跑` : '');
}
{
  // 未登入亂評應該被 RLS 擋下來
  const { error } = await sb.from('reviews').insert({
    rater_id: '00000000-0000-0000-0000-000000000000',
    ratee_id: '00000000-0000-0000-0000-000000000001',
    rating: 5,
  });
  check('RLS 擋住偽造評價', !!error, error ? '' : '⚠ 未登入竟然寫得進 reviews！');
}

// ---------- 3d. 0005：ends_at_utc（前端有頁面直接查這個欄位） ----------
for (const t of ['availabilities', 'jobs']) {
  const { error } = await sb.from(t).select('ends_at_utc', { head: true, count: 'exact' });
  check(
    `${t}.ends_at_utc（過期過濾）`,
    !error,
    error ? '缺這個欄位 —— 0005 沒跑，/jobs 會報錯、/worker 的時段會變空' : '',
  );
}

// ---------- 4. RLS 是否真的開著 ----------
{
  // 未登入時 contacts 應該讀不到任何一列（不是報錯，是回空陣列）
  const { data, error } = await sb.from('contacts').select('user_id, phone').limit(5);
  const leaked = !error && Array.isArray(data) && data.length > 0;
  check(
    'RLS 保護聯絡方式',
    !leaked,
    leaked ? `⚠ 未登入就撈到 ${data.length} 筆聯絡資料 —— RLS 沒生效！` : '',
  );
}

// ---------- 5. 現有資料量 ----------
const counts = {};
for (const t of ['profiles', 'services', 'availabilities', 'jobs']) {
  const { count } = await sb.from(t).select('*', { head: true, count: 'exact' });
  counts[t] = count ?? 0;
}

// ---------- 報告 ----------
console.log('\n  有空鴨 · Supabase 設定檢查\n' + '─'.repeat(52));
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'}  ${r.name}${r.detail ? `\n       ${r.detail}` : ''}`);
}
console.log('─'.repeat(52));
console.log(
  `  目前資料：profiles ${counts.profiles} · services ${counts.services} · ` +
    `時段 ${counts.availabilities} · 工作 ${counts.jobs}`,
);

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log(`\n  ✗ ${failed.length} 項未通過，見上方說明\n`);
  process.exit(1);
}
console.log('\n  ✓ 全部通過，可以開始註冊使用了\n');
