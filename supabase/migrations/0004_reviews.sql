-- =====================================================================
--  有空鴨 FreeDuck — 0004 評價系統
--
--  規則：邀約／應徵被接受，且「工作時段已經結束」→ 雙方可互評一次。
--  不需要任何人按「完成」，時間到了自動開放。
--
--  ⚠ 時區：date + time 是不帶時區的 timestamp，而 Supabase 跑在 UTC。
--     若不指定，8/30 18:00 會被當成 UTC 18:00（台灣時間 8/31 凌晨 2 點），
--     評價會晚 8 小時才開放。所以一律 at time zone 'Asia/Taipei'。
-- =====================================================================

-- --------------------------------------------------- 評價綁定到「哪一次委託」
alter table public.reviews
  add column if not exists invite_id      uuid references public.invites(id) on delete cascade,
  add column if not exists application_id uuid references public.applications(id) on delete cascade;

-- 原本的 unique(rater_id, ratee_id, created_at) 擋不住重複評價，換掉
alter table public.reviews
  drop constraint if exists reviews_rater_id_ratee_id_created_at_key;

-- 同一次委託，同一個人只能評一次
create unique index if not exists reviews_invite_uniq
  on public.reviews (rater_id, invite_id) where invite_id is not null;
create unique index if not exists reviews_app_uniq
  on public.reviews (rater_id, application_id) where application_id is not null;

-- ------------------------------------------------------- 可不可以評這一筆？
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
         and ((a.date + a.end_time) at time zone 'Asia/Taipei') < now()
    )
    when p_application is not null then exists (
      select 1
        from applications ap
        join jobs j on j.id = ap.job_id
       where ap.id = p_application
         and ap.status in ('accepted','completed')
         and ((ap.worker_id    = auth.uid() and j.employer_id = p_ratee)
           or (j.employer_id   = auth.uid() and ap.worker_id  = p_ratee))
         and ((j.date + j.end_time) at time zone 'Asia/Taipei') < now()
    )
    else false
  end;
$fn$;

-- ★ 換掉 0002 的「誰都能評誰」
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (
    rater_id = auth.uid()
    and public.may_review(invite_id, application_id, ratee_id)
  );

-- 評完想改內容可以，但不能改成別人的
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

-- 改評價也要重算星等（0002 只掛了 insert）
drop trigger if exists on_review_updated on public.reviews;
create trigger on_review_updated
  after update on public.reviews
  for each row execute function public.refresh_rating();

-- ------------------------------------------------------------ 待評價清單
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
  -- 邀約：我是雇主 → 評工人；我是工人 → 評雇主
  select
    'invite'::text,
    i.id,
    other.id,
    other.display_name,
    other.avatar_url,
    coalesce(s.title, '') ,
    a.date,
    a.end_time
  from invites i
  join availabilities a on a.id = i.availability_id
  left join services s on s.id = i.service_id
  join profiles other
    on other.id = case when i.employer_id = auth.uid() then i.worker_id else i.employer_id end
  where i.status in ('accepted','completed')
    and (i.employer_id = auth.uid() or i.worker_id = auth.uid())
    and ((a.date + a.end_time) at time zone 'Asia/Taipei') < now()
    and not exists (
      select 1 from reviews r
       where r.rater_id = auth.uid() and r.invite_id = i.id
    )

  union all

  -- 應徵：我是工人 → 評雇主；我是雇主 → 評工人
  select
    'application'::text,
    ap.id,
    other.id,
    other.display_name,
    other.avatar_url,
    j.title,
    j.date,
    j.end_time
  from applications ap
  join jobs j on j.id = ap.job_id
  join profiles other
    on other.id = case when ap.worker_id = auth.uid() then j.employer_id else ap.worker_id end
  where ap.status in ('accepted','completed')
    and (ap.worker_id = auth.uid() or j.employer_id = auth.uid())
    and ((j.date + j.end_time) at time zone 'Asia/Taipei') < now()
    and not exists (
      select 1 from reviews r
       where r.rater_id = auth.uid() and r.application_id = ap.id
    )

  order by 7 desc, 8 desc;
$fn$;

-- --------------------------------------------- 徽章加上「待評價」這一項
create or replace function public.my_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select jsonb_build_object(
    'messages', (
      select count(*) from messages m
        join conversations c on c.id = m.conversation_id
       where (c.user_a = auth.uid() or c.user_b = auth.uid())
         and m.sender_id <> auth.uid()
         and m.read_at is null
    ),
    'invites', (
      select count(*) from invites
       where worker_id = auth.uid() and status = 'pending'
    ),
    'applications', (
      select count(*) from applications ap
        join jobs j on j.id = ap.job_id
       where j.employer_id = auth.uid() and ap.status = 'pending'
    ),
    'contact_requests', (
      select count(*) from contact_requests
       where target_id = auth.uid() and status = 'pending'
    ),
    'reviews', (select count(*) from public.pending_reviews())
  );
$fn$;

-- ------------------------------------------- 某人的評價（公開頁要顯示）
create or replace function public.reviews_of(p_user uuid)
returns table (
  id         uuid,
  rating     int,
  comment    text,
  created_at timestamptz,
  rater_id   uuid,
  rater_name text,
  rater_avatar text
)
language sql
stable
set search_path = public
as $fn$
  select r.id, r.rating, r.comment, r.created_at,
         p.id, p.display_name, p.avatar_url
    from reviews r
    join profiles p on p.id = r.rater_id
   where r.ratee_id = p_user
   order by r.created_at desc
   limit 50;
$fn$;
