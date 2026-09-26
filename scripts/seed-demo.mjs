/**
 * 建立示範帳號，把冷啟動期間空空的頁面填起來。
 *
 *   node scripts/seed-demo.mjs            # 只列出會建什麼，不執行
 *   node scripts/seed-demo.mjs --yes      # 真的建立
 *   node scripts/seed-demo.mjs --remove   # 把示範帳號全部刪掉
 *
 * 五個人都設定成「本業之外想接點零工」的一般人，分散在不同行業與地區，
 * 服務項目與空檔都照各自的作息排 —— 值班的排平日白天、幼教的排週末。
 *
 * 名字用暱稱不用全名：真實使用者不會拿身分證上的名字去註冊。取名的習慣
 * 也刻意分散（單名／阿X／X老師／X媽／小X），全用同一種一樣像批次產的。
 *
 * 帳號一律用 @demo.freeduck.tw 結尾，這是唯一的辨識方式：
 * --remove 就是靠它把人找回來刪掉，所以別改這個網域。
 *
 * 直接寫 auth.users 是刻意的：email_confirmed_at 一併填上，就不必跑驗證信。
 * profile 與 contacts 會由 on_auth_user_created 觸發器自動建出來。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const DOMAIN = 'demo.freeduck.tw';
const PASSWORD = 'FreeDuckDemo2026!';

/** 每個人的空檔從今天起排幾天 */
const DAYS_AHEAD = 21;

// ---------------------------------------------------------------- 五個人

const PEOPLE = [
  {
    email: `ssu.yu@${DOMAIN}`,
    name: '思妤',
    city: '臺北市',
    district: '大安區',
    bio: '動物醫院助理，每天跟貓狗混在一起。本業是早班，下班後跟週末想接一點遛狗跟寵物保母。餵藥、打皮下這種醫院學來的事我都能做，有需要可以先問。',
    services: [
      { category: 'dog_walk', title: '遛狗（含清理）', rate: 300, unit: 'hourly', note: '大型犬可，會帶撿便袋跟水' },
      { category: 'pet_sit', title: '到府寵物保母', rate: 600, unit: 'hourly', note: '餵食、清貓砂、陪玩，可傳照片回報' },
      { category: 'pet_drive', title: '寵物接送（看診）', rate: 350, unit: 'hourly', note: '熟大安信義一帶的動物醫院' },
    ],
    // 0 = 週一
    pattern: { 1: [['19:00', '21:00']], 3: [['19:00', '21:00']], 5: [['09:00', '12:00'], ['14:00', '18:00']], 6: [['09:00', '12:00']] },
  },
  {
    email: `po.han@${DOMAIN}`,
    name: '阿翰',
    city: '新北市',
    district: '板橋區',
    bio: '跑外送第三年，板橋中和一帶的巷子我大概都認得。機車有大箱子，載東西載寵物都行。下午通常是離峰，那段時間想多接一點事做。',
    services: [
      { category: 'pet_drive', title: '寵物接送', rate: 300, unit: 'hourly', note: '有透氣寵物箱，怕熱的話可以約早一點' },
      { category: 'errand_buy', title: '代買跑腿', rate: 150, unit: 'hourly', note: '板橋、中和、永和跑得動' },
      { category: 'moving', title: '搬運幫手', rate: 350, unit: 'hourly', note: '一個人搬得動的量，大件要兩人請先講' },
    ],
    pattern: { 0: [['14:00', '17:00']], 1: [['14:00', '17:00']], 2: [['14:00', '17:00']], 3: [['14:00', '17:00']], 4: [['14:00', '17:00']] },
    jobs: [
      {
        category: 'stall', title: '週日夜市顧攤，缺一個人',
        description: '家裡在南雅夜市擺鹽酥雞，週日人最多，需要一個人幫忙裝袋跟收錢。不用經驗，我會教。做滿三小時給 700。',
        weekday: 0, start: '18:00', end: '22:00', rate: 220, unit: 'hourly', headcount: 1,
      },
    ],
  },
  {
    email: `chia.ying@${DOMAIN}`,
    name: '穎老師',
    city: '臺北市',
    district: '文山區',
    bio: '幼兒園老師，帶中班。有合格教保員證照跟急救證。平常上班已經跟小孩相處一整天了，但週末還是願意接臨時托育 —— 主要是家長真的很需要，我知道那種找不到人的感覺。',
    services: [
      { category: 'babysit', title: '臨時托育（3–6 歲）', rate: 280, unit: 'hourly', note: '可到府，兩個小孩以上請先說' },
      { category: 'homework', title: '課後陪寫功課', rate: 400, unit: 'hourly', note: '國小低中年級，不含才藝' },
    ],
    pattern: { 5: [['09:00', '12:00'], ['14:00', '18:00']], 6: [['09:00', '12:00'], ['14:00', '17:00']] },
    jobs: [
      {
        category: 'hospital', title: '找人陪阿嬤回診（木柵）',
        description: '阿嬤每個月要回診拿藥，我那天要上班走不開。需要陪她從家裡到萬芳醫院、等叫號、再送回來，大概三小時。阿嬤走得慢但自己走得動，不用推輪椅。',
        offsetDays: 8, start: '09:00', end: '12:00', rate: 300, unit: 'hourly', headcount: 1,
      },
    ],
  },
  {
    email: `meng.hua@${DOMAIN}`,
    name: '樺媽',
    city: '新北市',
    district: '中和區',
    bio: '以前在餐廳做內場，生完小孩後離開職場。現在兩個孩子都上學了，白天空出一大段時間。想慢慢接一些事做，不打算回去做全職。手腳算快，備料跟打掃都可以。',
    services: [
      { category: 'cleaning', title: '到府清潔', rate: 300, unit: 'hourly', note: '一般居家打掃，不含外窗跟高處' },
      { category: 'laundry', title: '洗衣整理、收納', rate: 280, unit: 'hourly' },
      { category: 'boh', title: '內場備料幫手', rate: 220, unit: 'hourly', note: '切配、備料都做過，有廚師證' },
    ],
    pattern: { 0: [['09:00', '12:00']], 1: [['09:00', '12:00'], ['13:00', '16:00']], 2: [['09:00', '12:00']], 3: [['09:00', '12:00'], ['13:00', '16:00']], 4: [['09:00', '12:00']] },
  },
  {
    email: `che.wei@${DOMAIN}`,
    name: '小瑋',
    city: '臺北市',
    district: '中正區',
    bio: '資工系大四，正在想畢業要去上班還是自己做點什麼。接案一方面是賺錢，一方面是想知道自己的東西有沒有人要。教長輩用手機意外地是我最喜歡的一項。',
    services: [
      { category: 'tech_help', title: '手機／電腦教學', rate: 350, unit: 'hourly', note: '很有耐心，長輩優先。也可以幫忙處理中毒、備份' },
      { category: 'tutor', title: '國高中數學家教', rate: 500, unit: 'hourly', note: '學測數A 14 級分' },
      { category: 'video_edit', title: '短影音剪輯', rate: 800, unit: 'daily', note: '一支 60 秒以內，含字幕' },
    ],
    pattern: { 1: [['19:00', '22:00']], 2: [['19:00', '22:00']], 4: [['19:00', '22:00']], 5: [['13:00', '18:00']], 6: [['13:00', '18:00']] },
    jobs: [
      {
        category: 'moving', title: '搬宿舍，找一個人幫忙扛',
        description: '從公館的宿舍搬到景美的套房，東西不多但有一張書桌跟兩箱書，我一個人搬不動。有小貨車更好，沒有的話我叫車。大概兩小時結束。',
        offsetDays: 3, start: '13:00', end: '16:00', rate: 400, unit: 'hourly', headcount: 1,
      },
    ],
  },
];

// ---------------------------------------------------------------- 連線

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('✗ 需要 SUPABASE_DB_PASSWORD（見 D:/claude-home/secrets/README.md）');
  process.exit(1);
}

const client = new pg.Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  user: `postgres.${ref}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

// ---------------------------------------------------------------- 工具

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 從今天起 DAYS_AHEAD 天內，符合 pattern 的 (日期, 起, 迄) */
function slotsFor(pattern) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    // JS 的 getDay() 週日是 0，pattern 用的是週一 = 0
    const key = (d.getDay() + 6) % 7;
    for (const [start, end] of pattern[key] ?? []) out.push([iso(d), start, end]);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return iso(d);
}

/** 下一個指定星期幾（0 = 週日）。標題寫「週日」就得真的落在週日，不然一眼假 */
function nextWeekday(target) {
  const d = new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() !== target);
  return iso(d);
}

// ---------------------------------------------------------------- 主流程

const mode = process.argv.includes('--remove')
  ? 'remove'
  : process.argv.includes('--yes')
    ? 'create'
    : 'dry';

await client.connect();

try {
  if (mode === 'remove') {
    const { rows } = await client.query(
      `delete from auth.users where email like $1 returning email`,
      [`%@${DOMAIN}`],
    );
    console.log(rows.length ? `已刪除 ${rows.length} 個示範帳號：` : '沒有示範帳號可刪');
    rows.forEach((r) => console.log('  ·', r.email));
    console.log('\n服務、空檔、工作、邀約都會連鎖刪掉（外鍵 on delete cascade）。');
  } else if (mode === 'dry') {
    console.log(`預演 —— 加 --yes 才會真的建立\n`);
    for (const p of PEOPLE) {
      const slots = slotsFor(p.pattern);
      console.log(`${p.name}  ${p.city}${p.district}  <${p.email}>`);
      console.log(`  服務 ${p.services.length} 項：${p.services.map((s) => s.title).join('、')}`);
      console.log(`  未來 ${DAYS_AHEAD} 天空檔 ${slots.length} 個`);
      if (p.jobs?.length) console.log(`  發布工作 ${p.jobs.length} 則：${p.jobs.map((j) => j.title).join('、')}`);
      console.log();
    }
  } else {
    await client.query('begin');

    for (const p of PEOPLE) {
      // 已經有就跳過，讓這支可以重複跑
      const exists = await client.query('select id from auth.users where email = $1', [p.email]);
      if (exists.rows.length) {
        console.log(`− ${p.name} 已存在，跳過`);
        continue;
      }

      const {
        rows: [user],
      } = await client.query(
        `insert into auth.users (
           instance_id, id, aud, role, email, encrypted_password,
           email_confirmed_at, created_at, updated_at,
           raw_app_meta_data, raw_user_meta_data
         ) values (
           '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
           'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')),
           now(), now(), now(),
           '{"provider":"email","providers":["email"]}'::jsonb,
           jsonb_build_object('display_name', $3::text)
         ) returning id`,
        [p.email, PASSWORD, p.name],
      );

      // 沒有 identities 這一列，Supabase 的 email 登入會找不到人
      await client.query(
        `insert into auth.identities (
           id, user_id, identity_data, provider, provider_id,
           last_sign_in_at, created_at, updated_at
         ) values (
           gen_random_uuid(), $1::text::uuid,
           jsonb_build_object('sub', $1::text, 'email', $2::text),
           'email', $2::text, now(), now(), now()
         )`,
        [user.id, p.email],
      );

      // profile 由觸發器建好了，這裡補上其餘欄位
      await client.query(
        `update public.profiles
            set display_name = $2, bio = $3, city = $4, district = $5
          where id = $1`,
        [user.id, p.name, p.bio, p.city, p.district],
      );

      for (const s of p.services) {
        await client.query(
          `insert into public.services (user_id, category_id, title, rate, rate_unit, note)
           values ($1, $2, $3, $4, $5, $6)`,
          [user.id, s.category, s.title, s.rate, s.unit, s.note ?? null],
        );
      }

      const slots = slotsFor(p.pattern);
      for (const [date, start, end] of slots) {
        await client.query(
          `insert into public.availabilities (user_id, date, start_time, end_time)
           values ($1, $2, $3, $4)
           on conflict (user_id, date, start_time, end_time) do nothing`,
          [user.id, date, start, end],
        );
      }

      for (const j of p.jobs ?? []) {
        await client.query(
          `insert into public.jobs (
             employer_id, category_id, title, description, date,
             start_time, end_time, city, district, rate, rate_unit, headcount
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            user.id, j.category, j.title, j.description,
            j.weekday != null ? nextWeekday(j.weekday) : dateIn(j.offsetDays),
            j.start, j.end, p.city, p.district, j.rate, j.unit, j.headcount,
          ],
        );
      }

      console.log(
        `✓ ${p.name}  服務 ${p.services.length}　空檔 ${slots.length}　工作 ${(p.jobs ?? []).length}`,
      );
    }

    await client.query('commit');
    console.log(`\n完成。五個帳號的密碼都是：${PASSWORD}`);
    console.log('要收掉的時候跑：node scripts/seed-demo.mjs --remove');
  }
} catch (e) {
  if (mode === 'create') await client.query('rollback').catch(() => {});
  console.error('✗ 失敗：', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
