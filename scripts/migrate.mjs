/**
 * 直接連 Supabase Postgres 執行 supabase/migrations 底下的 SQL。
 *
 *   $env:SUPABASE_DB_PASSWORD = '...'
 *   node scripts/migrate.mjs              # 跑所有還沒跑過的
 *   node scripts/migrate.mjs --status     # 只看哪些跑過了
 *   node scripts/migrate.mjs --mark 0001_init.sql   # 標記為已執行但不跑
 *
 * 已執行的檔名記在 _meta.migrations（不在 public schema，所以不會被 API 曝露），
 * 這樣「以為跑了其實沒跑」就不會再發生。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'supabase', 'migrations');

// ---------------------------------------------------------------- 連線資訊
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('✗ 沒有 SUPABASE_DB_PASSWORD 環境變數');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

// 新專案的直連是 IPv6-only，沒 IPv6 的機器要走 pooler（IPv4）。兩個都試。
const CANDIDATES = [
  { label: '直連', host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  {
    label: 'Session Pooler (ap-northeast-1)',
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
  },
  {
    label: 'Session Pooler (ap-northeast-2)',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
  },
];

async function connect() {
  const errors = [];
  for (const c of CANDIDATES) {
    const client = new pg.Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password,
      database: 'postgres',
      // Supabase 用自簽根憑證，這裡是本機對自己的專案，關掉鏈驗證即可
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    try {
      await client.connect();
      console.log(`  連線方式：${c.label}  (${c.host})`);
      return client;
    } catch (e) {
      errors.push(`${c.label}: ${e.message}`);
      try {
        await client.end();
      } catch {}
    }
  }
  console.error('✗ 全部連線方式都失敗：\n   ' + errors.join('\n   '));
  process.exit(1);
}

// ---------------------------------------------------------------- 主流程
const args = process.argv.slice(2);
const statusOnly = args.includes('--status');
const markIdx = args.indexOf('--mark');
const toMark = markIdx >= 0 ? args.slice(markIdx + 1) : [];

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = await connect();

await client.query(`
  create schema if not exists _meta;
  create table if not exists _meta.migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  );
`);

const { rows } = await client.query('select name from _meta.migrations');
const done = new Set(rows.map((r) => r.name));

console.log('\n  有空鴨 · 資料庫遷移');
console.log('─'.repeat(56));

if (statusOnly) {
  for (const f of files) console.log(`  ${done.has(f) ? '✓ 已執行' : '· 未執行'}  ${f}`);
  console.log('─'.repeat(56) + '\n');
  await client.end();
  process.exit(0);
}

if (toMark.length) {
  for (const name of toMark) {
    if (!files.includes(name)) {
      console.log(`  ⚠ 找不到 ${name}，略過`);
      continue;
    }
    await client.query(
      'insert into _meta.migrations (name) values ($1) on conflict do nothing',
      [name],
    );
    console.log(`  ⊙ 標記為已執行（未實際執行）  ${name}`);
  }
  console.log('─'.repeat(56) + '\n');
  await client.end();
  process.exit(0);
}

let ran = 0;
let failed = false;

for (const f of files) {
  if (done.has(f)) {
    console.log(`  ✓ 已執行  ${f}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, f), 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into _meta.migrations (name) values ($1)', [f]);
    await client.query('commit');
    console.log(`  ✓ 執行成功  ${f}`);
    ran++;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.log(`  ✗ 失敗  ${f}`);
    console.log(`      ${e.message}`);
    if (e.position) {
      const upto = sql.slice(0, Number(e.position));
      const line = upto.split('\n').length;
      console.log(`      第 ${line} 行附近：${sql.split('\n')[line - 1]?.trim()}`);
    }
    if (e.hint) console.log(`      提示：${e.hint}`);
    failed = true;
    break;
  }
}

console.log('─'.repeat(56));
console.log(failed ? '  ✗ 中斷（該檔已 rollback，資料庫沒有半套狀態）\n' : `  ✓ 完成，本次執行 ${ran} 個\n`);

await client.end();
process.exit(failed ? 1 : 0);
