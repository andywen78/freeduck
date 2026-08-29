/**
 * 列出某張表目前的 RLS 政策與觸發器，用來確認資料庫層真的照預期設定。
 *   node scripts/inspect-policies.mjs reviews contacts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

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

const tables = process.argv.slice(2);
for (const t of tables.length ? tables : ['reviews']) {
  const pol = await client.query(
    `select cmd, policyname from pg_policies
      where schemaname = 'public' and tablename = $1 order by cmd, policyname`,
    [t],
  );
  const trg = await client.query(
    `select tgname from pg_trigger tg
       join pg_class c on c.oid = tg.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = $1 and not tg.tgisinternal`,
    [t],
  );

  console.log(`\n  ${t}`);
  console.log('  ' + '─'.repeat(46));
  const cmds = new Set(pol.rows.map((r) => r.cmd));
  for (const c of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    const names = pol.rows.filter((r) => r.cmd === c || r.cmd === 'ALL').map((r) => r.policyname);
    console.log(
      `    ${c.padEnd(7)} ${names.length ? '✓ ' + names.join(', ') : '✗ 沒有政策 → RLS 預設拒絕'}`,
    );
  }
  void cmds;
  console.log(`    觸發器  ${trg.rows.map((r) => r.tgname).join(', ') || '（無）'}`);
}

console.log();
await client.end();
