-- =====================================================================
--  有空鴨 FreeDuck — 0005
--  修正：已經結束的時段／工作仍會出現在搜尋結果
--
--  原本只比 date >= current_date，所以「今天但已經過掉」的時段照樣列出。
--  另外 current_date 是 UTC 日期，台灣時間 08:00 前它還停在昨天。
--
--  作法：加一個「結束時間（UTC）」的 generated column 來比對。
--  ⚠ 為什麼用寫死的 -8 小時而不是 at time zone 'Asia/Taipei'：
--     generated column 要求 IMMUTABLE，而 timezone() 是 STABLE（依賴時區資料庫）。
--     台灣沒有日光節約時間、UTC+8 從 1980 年就沒變過，固定位移是精確的。
-- =====================================================================

alter table public.availabilities
  add column if not exists ends_at_utc timestamp
  generated always as ((date + end_time) - interval '8 hours') stored;

alter table public.jobs
  add column if not exists ends_at_utc timestamp
  generated always as ((date + end_time) - interval '8 hours') stored;

create index if not exists avail_ends_idx on public.availabilities (ends_at_utc)
  where status = 'open';
create index if not exists jobs_ends_idx on public.jobs (ends_at_utc)
  where status = 'open';

-- ------------------------------------------------- 搜尋：只列「還沒結束」的
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
    and a.ends_at_utc > (now() at time zone 'UTC')   -- ★ 已經結束的不列
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

-- --------------------------------- 評價開放判斷改用同一個欄位（一致且有索引）
create or replace function public.may_review(
  p_invite      uuid,
  p_application uuid,
  p_ratee       uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when p_invite is not null then exists (
      select 1
        from invites i
        join availabilities a on a.id = i.availability_id
       where i.id = p_invite
         and i.status in ('accepted','completed')
         and ((i.employer_id = auth.uid() and i.worker_id   = p_ratee)
           or (i.worker_id   = auth.uid() and i.employer_id = p_ratee))
         and a.ends_at_utc < (now() at time zone 'UTC')
    )
    when p_application is not null then exists (
      select 1
        from applications ap
        join jobs j on j.id = ap.job_id
       where ap.id = p_application
         and ap.status in ('accepted','completed')
         and ((ap.worker_id  = auth.uid() and j.employer_id = p_ratee)
           or (j.employer_id = auth.uid() and ap.worker_id  = p_ratee))
         and j.ends_at_utc < (now() at time zone 'UTC')
    )
    else false
  end;
$fn$;

create or replace function public.pending_reviews()
returns table (
  kind               text,
  engagement_id      uuid,
  counterparty_id    uuid,
  counterparty_name  text,
  counterparty_avatar text,
  label              text,
  happened_on        date,
  end_time           time
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    'invite'::text, i.id, other.id, other.display_name, other.avatar_url,
    coalesce(s.title, ''), a.date, a.end_time
  from invites i
  join availabilities a on a.id = i.availability_id
  left join services s on s.id = i.service_id
  join profiles other
    on other.id = case when i.employer_id = auth.uid() then i.worker_id else i.employer_id end
  where i.status in ('accepted','completed')
    and (i.employer_id = auth.uid() or i.worker_id = auth.uid())
    and a.ends_at_utc < (now() at time zone 'UTC')
    and not exists (
      select 1 from reviews r where r.rater_id = auth.uid() and r.invite_id = i.id
    )

  union all

  select
    'application'::text, ap.id, other.id, other.display_name, other.avatar_url,
    j.title, j.date, j.end_time
  from applications ap
  join jobs j on j.id = ap.job_id
  join profiles other
    on other.id = case when ap.worker_id = auth.uid() then j.employer_id else ap.worker_id end
  where ap.status in ('accepted','completed')
    and (ap.worker_id = auth.uid() or j.employer_id = auth.uid())
    and j.ends_at_utc < (now() at time zone 'UTC')
    and not exists (
      select 1 from reviews r where r.rater_id = auth.uid() and r.application_id = ap.id
    )

  order by 7 desc, 8 desc;
$fn$;
