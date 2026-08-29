/**
 * 清空所有使用者資料（開發／測試用）。保留資料表結構與 migration 紀錄。
 *
 *   node scripts/reset-data.mjs            # 只列出會刪掉什麼，不執行
 *   node scripts/reset-data.mjs --yes      # 真的刪
 *
 * 只要刪 auth.users 就會連鎖清掉 profiles → services / availabilities / jobs /
 * invites / applications / conversations / messages / reviews / contact_requests，
 * 因為外鍵都設了 on delete cascade。逐表刪反而容易漏。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const confirmed = process.argv.includes('--yes');

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

const client = new pg.Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  user: `postgres.${ref}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const TABLES = [
  ['auth.users', '帳號'],
  ['profiles', '個人檔案'],
  ['contacts', '聯絡方式'],
  ['services', '服務項目'],
  ['availabilities', '空閒時段'],
  ['jobs', '工作'],
  ['invites', '邀約'],
  ['applications', '應徵'],
  ['contact_requests', '聯絡請求'],
  ['conversations', '對話'],
  ['messages', '訊息'],
  ['reviews', '評價'],
];

async function counts() {
  const out = [];
  for (const [t, label] of TABLES) {
    const { rows } = await client.query(`select count(*)::int n from ${t}`);
    out.push({ 資料表: t, 內容: label, 筆數: rows[0].n });
  }
  return out;
}

console.log('\n  清除前：');
console.table(await counts());

if (!confirmed) {
  console.log('  這是預演。確定要刪的話加上 --yes\n');
  await client.end();
  process.exit(0);
}

await client.query('begin');
// 刪帳號即可，其餘靠 on delete cascade 連鎖清除
const { rowCount } = await client.query('delete from auth.users');
await client.query('commit');

console.log(`\n  已刪除 ${rowCount} 個帳號，連鎖清除相關資料。`);
console.log('\n  清除後：');
console.table(await counts());
console.log('  資料表結構與 _meta.migrations 紀錄都保留。\n');

await client.end();
