/**
 * 用管理者身分跑一段唯讀 SQL，用來檢查資料是否符合預期。
 *   node scripts/sql.mjs "select count(*) from messages where kind='system'"
 *
 * 只允許 select / with 開頭，避免手滑改到資料。要改資料請寫成 migration。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const sql = process.argv.slice(2).join(' ').trim();
if (!/^(select|with)\b/i.test(sql)) {
  console.error('✗ 只接受 select / with 開頭的唯讀查詢');
  process.exit(1);
}

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
try {
  const { rows } = await client.query(sql);
  if (!rows.length) console.log('（沒有資料）');
  else console.table(rows);
} catch (e) {
  console.error('✗ ' + e.message);
} finally {
  await client.end();
}
