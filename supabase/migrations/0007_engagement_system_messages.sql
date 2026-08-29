-- =====================================================================
--  有空鴨 FreeDuck — 0007
--  接受邀約／錄取應徵的當下就建立對話，並寫入一筆系統訊息記錄「這次是哪一筆」。
--
--  原本對話是點「開始聊聊」才 lazy 建立，所以：
--    1. 同一個人來第三次，三次委託的對話全混在一起分不出來
--    2. 沒點過的話根本沒有對話，之後想找同一個人也找不到入口
--
--  系統訊息的顯示文字由前端渲染（分類名稱在 lib/categories.ts，SQL 這邊沒有），
--  所以結構化資料放 meta，body 只留純文字備援給訊息列表的預覽用。
-- =====================================================================

alter table public.messages
  add column if not exists kind text not null default 'text'
    check (kind in ('text', 'system')),
  add column if not exists meta jsonb;

-- 系統訊息沒有發送者
alter table public.messages alter column sender_id drop not null;

-- ------------------------------------------------- 取得或建立兩人的對話
-- get_or_create_conversation() 是給前端用的（吃 auth.uid()），
-- 觸發器裡沒有 auth.uid()，所以另外做一個吃兩個參數的版本。
create or replace function public.ensure_conversation(p_a uuid, p_b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  lo  uuid := least(p_a, p_b);
  hi  uuid := greatest(p_a, p_b);
  cid uuid;
begin
  if p_a = p_b then return null; end if;

  select id into cid from conversations where user_a = lo and user_b = hi;
  if cid is null then
    insert into conversations (user_a, user_b) values (lo, hi) returning id into cid;
  end if;
  return cid;
end;
$fn$;

-- ------------------------------------------- 邀約被接受 → 開對話 + 系統訊息
create or replace function public.on_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cid   uuid;
  a     availabilities%rowtype;
  s     services%rowtype;
  label text;
begin
  select * into a from availabilities where id = new.availability_id;
  select * into s from services where id = new.service_id;

  cid := ensure_conversation(new.employer_id, new.worker_id);
  if cid is null then return new; end if;

  label := coalesce(nullif(s.title, ''), '委託');

  insert into messages (conversation_id, sender_id, kind, body, meta)
  values (
    cid,
    null,
    'system',
    format('已接受邀約 · %s %s–%s · %s',
           to_char(a.date, 'MM/DD'),
           to_char(a.start_time, 'HH24:MI'),
           to_char(a.end_time, 'HH24:MI'),
           label),
    jsonb_build_object(
      'type', 'invite_accepted',
      'invite_id', new.id,
      'employer_id', new.employer_id,
      'worker_id', new.worker_id,
      'date', a.date,
      'start_time', a.start_time,
      'end_time', a.end_time,
      'category_id', s.category_id,
      'title', s.title,
      'rate', coalesce(new.offered_rate, s.rate),
      'rate_unit', s.rate_unit
    )
  );
  return new;
end;
$fn$;

drop trigger if exists on_invite_accepted_trg on public.invites;
create trigger on_invite_accepted_trg
  after update on public.invites
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.on_invite_accepted();

-- ------------------------------------------ 應徵被錄取 → 開對話 + 系統訊息
create or replace function public.on_application_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cid uuid;
  j   jobs%rowtype;
begin
  select * into j from jobs where id = new.job_id;

  cid := ensure_conversation(j.employer_id, new.worker_id);
  if cid is null then return new; end if;

  insert into messages (conversation_id, sender_id, kind, body, meta)
  values (
    cid,
    null,
    'system',
    format('已錄取 · %s · %s %s–%s',
           j.title,
           to_char(j.date, 'MM/DD'),
           to_char(j.start_time, 'HH24:MI'),
           to_char(j.end_time, 'HH24:MI')),
    jsonb_build_object(
      'type', 'application_accepted',
      'application_id', new.id,
      'job_id', j.id,
      'employer_id', j.employer_id,
      'worker_id', new.worker_id,
      'date', j.date,
      'start_time', j.start_time,
      'end_time', j.end_time,
      'category_id', j.category_id,
      'title', j.title,
      'rate', j.rate,
      'rate_unit', j.rate_unit
    )
  );
  return new;
end;
$fn$;

drop trigger if exists on_application_accepted_trg on public.applications;
create trigger on_application_accepted_trg
  after update on public.applications
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.on_application_accepted();

-- ------------------------------------------------------------------ 補資料
-- 這個 migration 之前就已經接受過的邀約／應徵，補上對話與系統訊息，
-- 不然舊資料在聊天室裡看不到脈絡。
do $do$
declare
  r   record;
  cid uuid;
begin
  for r in
    select i.*, a.date, a.start_time, a.end_time, s.title, s.category_id, s.rate, s.rate_unit
      from invites i
      join availabilities a on a.id = i.availability_id
      left join services s on s.id = i.service_id
     where i.status in ('accepted', 'completed')
  loop
    cid := public.ensure_conversation(r.employer_id, r.worker_id);
    if cid is null then continue; end if;

    if not exists (
      select 1 from messages m
       where m.conversation_id = cid
         and m.kind = 'system'
         and m.meta->>'invite_id' = r.id::text
    ) then
      insert into messages (conversation_id, sender_id, kind, body, meta)
      values (
        cid, null, 'system',
        format('已接受邀約 · %s %s–%s · %s',
               to_char(r.date, 'MM/DD'),
               to_char(r.start_time, 'HH24:MI'),
               to_char(r.end_time, 'HH24:MI'),
               coalesce(nullif(r.title, ''), '委託')),
        jsonb_build_object(
          'type', 'invite_accepted', 'invite_id', r.id,
          'employer_id', r.employer_id, 'worker_id', r.worker_id,
          'date', r.date, 'start_time', r.start_time, 'end_time', r.end_time,
          'category_id', r.category_id, 'title', r.title,
          'rate', coalesce(r.offered_rate, r.rate), 'rate_unit', r.rate_unit
        )
      );
    end if;
  end loop;

  for r in
    select ap.*, j.employer_id, j.title, j.date, j.start_time, j.end_time,
           j.category_id, j.rate, j.rate_unit
      from applications ap
      join jobs j on j.id = ap.job_id
     where ap.status in ('accepted', 'completed')
  loop
    cid := public.ensure_conversation(r.employer_id, r.worker_id);
    if cid is null then continue; end if;

    if not exists (
      select 1 from messages m
       where m.conversation_id = cid
         and m.kind = 'system'
         and m.meta->>'application_id' = r.id::text
    ) then
      insert into messages (conversation_id, sender_id, kind, body, meta)
      values (
        cid, null, 'system',
        format('已錄取 · %s · %s %s–%s',
               r.title,
               to_char(r.date, 'MM/DD'),
               to_char(r.start_time, 'HH24:MI'),
               to_char(r.end_time, 'HH24:MI')),
        jsonb_build_object(
          'type', 'application_accepted', 'application_id', r.id, 'job_id', r.job_id,
          'employer_id', r.employer_id, 'worker_id', r.worker_id,
          'date', r.date, 'start_time', r.start_time, 'end_time', r.end_time,
          'category_id', r.category_id, 'title', r.title,
          'rate', r.rate, 'rate_unit', r.rate_unit
        )
      );
    end if;
  end loop;
end
$do$;
