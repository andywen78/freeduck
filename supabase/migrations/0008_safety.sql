-- =====================================================================
--  有空鴨 FreeDuck — 0008  上線前的安全機制
--
--  1. profiles.status —— 服務條款寫著「我們得移除相關內容、暫停或終止你的
--     帳號」，但先前資料庫裡根本沒有任何欄位可以停權。條款是空頭支票。
--
--  2. profiles 的欄位級權限 —— ★ 修既有漏洞。RLS 只管「哪一列」，管不到
--     「哪一欄」；profiles_update 允許改自己那列的任何欄位，所以任何人都能
--     直接打 REST 把自己的 rating_avg 改成 5.0。加了 status 之後更嚴重：
--     被停權的人可以自己改回 active。改用欄位級 GRANT 鎖住。
--     （refresh_rating 是 security definer，收回權限不影響星等重算。）
--
--  3. blocks —— 使用者自助封鎖。比檢舉更即時，而且不需要平台當裁判。
--
--  4. review_replies —— 被評的人可以公開回應。刻意用獨立資料表而不是在
--     reviews 上開 update 政策：RLS 擋不住「只能改某幾欄」，開了 update
--     就等於讓被評者能改掉評分本身，0006 封死的洞會重新打開。
-- =====================================================================

-- ------------------------------------------------------------ 帳號狀態
alter table public.profiles
  add column if not exists status text not null default 'active';

do $$
begin
  alter table public.profiles
    add constraint profiles_status_chk check (status in ('active', 'suspended'));
exception
  when duplicate_object then null;
end $$;

-- 只有停權的才需要進索引，正常帳號是絕大多數
create index if not exists profiles_status_idx on public.profiles (status)
  where status <> 'active';

-- ★ 欄位級權限：使用者只能改這五欄，status / rating_avg / rating_count 鎖死
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, bio, city, district)
  on public.profiles to authenticated;

-- -------------------------------------------------------------- 封鎖
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- 只看得到自己封鎖了誰。被封鎖的一方查不到自己被誰封鎖（不然等於通知對方）
drop policy if exists blocks_read on public.blocks;
create policy blocks_read on public.blocks for select
  using (blocker_id = auth.uid());

drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert
  with check (blocker_id = auth.uid());

drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete
  using (blocker_id = auth.uid());

-- 雙向判斷：任一方封鎖了對方就算數。
-- security definer 是必要的 —— blocks_read 只讓人看到自己那些列，
-- 沒有它就查不到「對方封鎖了我」。
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select a is not null
     and b is not null
     and exists (
           select 1 from blocks
            where (blocker_id = a and blocked_id = b)
               or (blocker_id = b and blocked_id = a)
         );
$fn$;

-- ------------------------------------ 搜尋：排除停權帳號與封鎖關係
-- 沿用 0005 的版本，只多加 p.status 與 is_blocked 兩個條件
create or replace function public.search_workers(
  p_date     date default null,
  p_start    time default null,
  p_end      time default null,
  p_category text default null,
  p_city     text default null,
  p_district text default null,
  p_limit    int  default 60
)
returns table (
  worker_id       uuid,
  display_name    text,
  avatar_url      text,
  bio             text,
  city            text,
  district        text,
  rating_avg      numeric,
  rating_count    int,
  availability_id uuid,
  avail_date      date,
  start_time      time,
  end_time        time,
  services        jsonb
)
language sql
stable
set search_path = public
as $fn$
  select
    p.id, p.display_name, p.avatar_url, p.bio, p.city, p.district,
    p.rating_avg, p.rating_count,
    a.id, a.date, a.start_time, a.end_time,
    (select jsonb_agg(jsonb_build_object(
              'id', s.id, 'category_id', s.category_id, 'title', s.title,
              'rate', s.rate, 'rate_unit', s.rate_unit, 'note', s.note)
            order by s.rate desc nulls last)
       from services s
      where s.user_id = p.id and s.is_active
        and (p_category is null or s.category_id = p_category))
  from availabilities a
  join profiles p on p.id = a.user_id
  where a.status = 'open'
    and a.ends_at_utc > (now() at time zone 'UTC')
    and p.status = 'active'                        -- ★ 停權的不列
    and not public.is_blocked(auth.uid(), p.id)    -- ★ 封鎖關係雙向隱藏
    and (p_date     is null or a.date = p_date)
    and (p_start    is null or a.start_time <= p_start)
    and (p_end      is null or a.end_time   >= p_end)
    and (p_city     is null or p.city = p_city)
    and (p_district is null or p.district = p_district)
    and exists (select 1 from services s
                 where s.user_id = p.id and s.is_active
                   and (p_category is null or s.category_id = p_category))
  order by a.date, a.start_time, p.rating_avg desc
  limit least(p_limit, 200);
$fn$;

-- ------------------------------------------- 工作列表也要跟著隱藏
-- 自己的工作永遠看得到，否則停權後連自己貼過什麼都查不到
drop policy if exists jobs_read on public.jobs;
create policy jobs_read on public.jobs for select
  using (
    employer_id = auth.uid()
    or (
      exists (select 1 from public.profiles p
               where p.id = employer_id and p.status = 'active')
      and not public.is_blocked(auth.uid(), employer_id)
    )
  );

-- --------------------------------------------- 封鎖對象不能再邀約
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert
  with check (
    employer_id = auth.uid()
    and not public.is_blocked(auth.uid(), worker_id)
  );

-- -------------------------------------------------------- 評價回應
create table if not exists public.review_replies (
  review_id  uuid primary key references public.reviews(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.review_replies enable row level security;

drop policy if exists rr_read on public.review_replies;
create policy rr_read on public.review_replies for select using (true);

-- 只有「被評的那個人」能回，一則評價只能回一次（primary key 保證）
drop policy if exists rr_insert on public.review_replies;
create policy rr_insert on public.review_replies for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.reviews r
                 where r.id = review_id and r.ratee_id = auth.uid())
  );

-- 不開 update / delete：跟評價一樣，送出即定案
