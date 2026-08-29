-- =====================================================================
--  有空鴨 FreeDuck — RLS、觸發器、搜尋函式
-- =====================================================================

-- ---------------------------------------------------------------- 工具函式
-- 兩人是否「媒合成立」（有被接受的邀約或應徵）→ 決定能不能看到聯絡方式
create or replace function public.is_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from invites i
    where i.status in ('accepted','completed')
      and ((i.employer_id = a and i.worker_id = b)
        or (i.employer_id = b and i.worker_id = a))
  ) or exists (
    select 1 from applications ap
    join jobs j on j.id = ap.job_id
    where ap.status in ('accepted','completed')
      and ((ap.worker_id = a and j.employer_id = b)
        or (ap.worker_id = b and j.employer_id = a))
  );
$fn$;

-- ---------------------------------------------------------------- 觸發器
-- 註冊時自動建立 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.contacts (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 新訊息 → 更新對話摘要（讓訊息列表不用再 join messages）
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.conversations
     set last_message    = left(new.body, 120),
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$fn$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- 新評價 → 重算被評者的平均星等
create or replace function public.refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.profiles p
     set rating_avg   = coalesce(s.avg_rating, 0),
         rating_count = coalesce(s.cnt, 0)
    from (select round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
            from public.reviews where ratee_id = new.ratee_id) s
   where p.id = new.ratee_id;
  return new;
end;
$fn$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.refresh_rating();

-- ------------------------------------------------------------ 搜尋「有空的人」
-- 這是本站與 104／小雞上工最核心的差別：用「時段」反查人，而不是查職缺
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
    and a.date >= current_date
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

-- 取得（或建立）兩人之間的對話
create or replace function public.get_or_create_conversation(other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me  uuid := auth.uid();
  lo  uuid;
  hi  uuid;
  cid uuid;
begin
  if me is null then raise exception '未登入'; end if;
  if me = other then raise exception '不能跟自己聊天'; end if;

  lo := least(me, other);
  hi := greatest(me, other);

  select id into cid from conversations where user_a = lo and user_b = hi;
  if cid is null then
    insert into conversations (user_a, user_b) values (lo, hi) returning id into cid;
  end if;
  return cid;
end;
$fn$;

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.contacts       enable row level security;
alter table public.services       enable row level security;
alter table public.availabilities enable row level security;
alter table public.jobs           enable row level security;
alter table public.invites        enable row level security;
alter table public.applications   enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.reviews        enable row level security;

-- profiles：公開目錄，人人可看；只能改自己的
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- contacts：只有自己、或媒合成立的對方看得到（★ 隱私核心）
create policy contacts_read   on public.contacts for select
  using (user_id = auth.uid() or public.is_connected(auth.uid(), user_id));
create policy contacts_insert on public.contacts for insert with check (user_id = auth.uid());
create policy contacts_update on public.contacts for update using (user_id = auth.uid());

-- services / availabilities：公開可看，只能改自己的
create policy services_read  on public.services for select using (true);
create policy services_write on public.services for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy avail_read  on public.availabilities for select using (true);
create policy avail_write on public.availabilities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- jobs：公開可看，只有發布者能改
create policy jobs_read  on public.jobs for select using (true);
create policy jobs_write on public.jobs for all
  using (employer_id = auth.uid()) with check (employer_id = auth.uid());

-- invites：只有當事雙方看得到
create policy invites_read on public.invites for select
  using (employer_id = auth.uid() or worker_id = auth.uid());
create policy invites_insert on public.invites for insert
  with check (employer_id = auth.uid());
create policy invites_update on public.invites for update
  using (employer_id = auth.uid() or worker_id = auth.uid());

-- applications：應徵者與該工作的雇主看得到
create policy apps_read on public.applications for select
  using (worker_id = auth.uid()
      or exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()));
create policy apps_insert on public.applications for insert
  with check (worker_id = auth.uid());
create policy apps_update on public.applications for update
  using (worker_id = auth.uid()
      or exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()));

-- 聊天：只有對話成員
create policy conv_read on public.conversations for select
  using (user_a = auth.uid() or user_b = auth.uid());

create policy msgs_read on public.messages for select
  using (exists (select 1 from public.conversations c
                  where c.id = conversation_id
                    and (c.user_a = auth.uid() or c.user_b = auth.uid())));
create policy msgs_insert on public.messages for insert
  with check (sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id
                   and (c.user_a = auth.uid() or c.user_b = auth.uid())));
create policy msgs_update on public.messages for update
  using (exists (select 1 from public.conversations c
                  where c.id = conversation_id
                    and (c.user_a = auth.uid() or c.user_b = auth.uid())));

-- 評價：公開可看，只能以自己的身分評
create policy reviews_read   on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert with check (rater_id = auth.uid());

-- ------------------------------------------------------------ 即時訂閱
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
