/**
 * 把已經建好的示範帳號改成暱稱（一次性）。
 *
 *   node scripts/rename-demo.mjs
 *
 * seed-demo.mjs 改用暱稱之後，先前建好的那批還留著全名。重跑 seed 會因為
 * 帳號已存在而跳過，所以另外用這支就地改名。
 * 只動 @demo.freeduck.tw 的帳號，碰不到真實使用者。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const DOMAIN = 'demo.freeduck.tw';

const NAMES = {
  'ssu.yu': '思妤',
  'po.han': '阿翰',
  'chia.ying': '穎老師',
  'meng.hua': '樺媽',
  'che.wei': '小瑋',
};

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
  await client.query('begin');
  for (const [local, nick] of Object.entries(NAMES)) {
    const email = `${local}@${DOMAIN}`;
    const { rows } = await client.query(
      `update public.profiles p
          set display_name = $2
         from auth.users u
        where u.id = p.id and u.email = $1
      returning p.display_name`,
      [email, nick],
    );
    if (!rows.length) {
      console.log(`− ${email} 找不到，跳過`);
      continue;
    }
    // meta 也一起改，之後如果有地方讀它才不會又冒出全名
    await client.query(
      `update auth.users
          set raw_user_meta_data =
                coalesce(raw_user_meta_data, '{}'::jsonb)
                || jsonb_build_object('display_name', $2::text)
        where email = $1`,
      [email, nick],
    );
    console.log(`✓ ${email} → ${nick}`);
  }
  await client.query('commit');
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('✗ 失敗：', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
