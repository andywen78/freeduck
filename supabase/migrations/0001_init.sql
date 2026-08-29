-- =====================================================================
--  有空鴨 FreeDuck — 初始 schema
--  核心概念：以「人的空閒時段」為單位的供給端目錄
--    availabilities = 我什麼時候有空
--    services       = 我能做什麼 + 各自的報價（一人多技能多價）
--  邀約 = 雇主挑「某人的某個時段」×「某個服務」
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- 個人檔案
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  bio          text,
  city         text,
  district     text,
  rating_avg   numeric(2,1) not null default 0,
  rating_count int          not null default 0,
  created_at   timestamptz  not null default now()
);

-- 聯絡方式獨立一張表：只有媒合成立的雙方看得到
create table public.contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone   text,
  line_id text
);

-- ------------------------------------------------------------ 我能做的事
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id text not null,                       -- 對應 src/lib/categories.ts
  title       text,                                -- 「國中數學家教」
  rate        int,                                 -- 面議時為 null
  rate_unit   text not null default 'hourly'
              check (rate_unit in ('hourly','daily','negotiable')),
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint rate_required check (rate_unit = 'negotiable' or rate is not null)
);
create index services_user_idx on public.services (user_id);
create index services_cat_idx  on public.services (category_id) where is_active;

-- -------------------------------------------------------------- 空閒時段
create table public.availabilities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  status     text not null default 'open' check (status in ('open','booked')),
  created_at timestamptz not null default now(),
  constraint time_order check (end_time > start_time),
  unique (user_id, date, start_time, end_time)
);
create index avail_date_idx on public.availabilities (date, status);
create index avail_user_idx on public.availabilities (user_id, date);

-- --------------------------------------------------------- 雇主發布的工作
create table public.jobs (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references public.profiles(id) on delete cascade,
  category_id  text not null,
  title        text not null,
  description  text,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  city         text not null,
  district     text not null,
  address_note text,
  rate         int,
  rate_unit    text not null default 'hourly'
               check (rate_unit in ('hourly','daily','negotiable')),
  headcount    int  not null default 1 check (headcount > 0),
  status       text not null default 'open' check (status in ('open','filled','closed')),
  created_at   timestamptz not null default now(),
  constraint job_time_order check (end_time > start_time)
);
create index jobs_open_idx on public.jobs (date, status);
create index jobs_cat_idx  on public.jobs (category_id, status);

-- ---------------------------------------------- 邀約（雇主 → 工人的某時段）
create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null references public.profiles(id) on delete cascade,
  worker_id       uuid not null references public.profiles(id) on delete cascade,
  availability_id uuid not null references public.availabilities(id) on delete cascade,
  service_id      uuid not null references public.services(id) on delete cascade,
  message         text,
  offered_rate    int,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled','completed')),
  created_at      timestamptz not null default now(),
  unique (employer_id, availability_id)
);
create index invites_worker_idx   on public.invites (worker_id, status);
create index invites_employer_idx on public.invites (employer_id, status);

-- ------------------------------------------------ 應徵（工人 → 雇主的工作）
create table public.applications (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs(id) on delete cascade,
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  message    text,
  status     text not null default 'pending'
             check (status in ('pending','accepted','declined','cancelled','completed')),
  created_at timestamptz not null default now(),
  unique (job_id, worker_id)
);
create index apps_worker_idx on public.applications (worker_id, status);
create index apps_job_idx    on public.applications (job_id, status);

-- ------------------------------------------------------------ 站內即時聊天
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles(id) on delete cascade,
  user_b          uuid not null references public.profiles(id) on delete cascade,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint pair_order check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (length(body) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index msgs_conv_idx on public.messages (conversation_id, created_at);

-- ------------------------------------------------------------------ 評價
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  ratee_id   uuid not null references public.profiles(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  constraint no_self_review check (rater_id <> ratee_id),
  unique (rater_id, ratee_id, created_at)
);
create index reviews_ratee_idx on public.reviews (ratee_id);
