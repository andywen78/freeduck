-- =====================================================================
--  有空鴨 FreeDuck — 0003
--  1. 聯絡方式改為「明示請求 → 對方同意」才解鎖（不再因媒合成立自動顯示）
--  2. 未讀徽章 RPC
--  3. 邀約／應徵／聯絡請求加入 Realtime，讓通知能即時推
-- =====================================================================

-- ------------------------------------------------------- 聯絡方式請求
create table if not exists public.contact_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','approved','declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_request check (requester_id <> target_id),
  unique (requester_id, target_id)
);
create index if not exists creq_target_idx    on public.contact_requests (target_id, status);
create index if not exists creq_requester_idx on public.contact_requests (requester_id, status);

alter table public.contact_requests enable row level security;

-- 只有當事雙方看得到
drop policy if exists creq_read on public.contact_requests;
create policy creq_read on public.contact_requests for select
  using (requester_id = auth.uid() or target_id = auth.uid());

-- 只有「已媒合成立」的人可以提出請求（防止路人亂敲）
drop policy if exists creq_insert on public.contact_requests;
create policy creq_insert on public.contact_requests for insert
  with check (requester_id = auth.uid() and public.is_connected(auth.uid(), target_id));

-- 只有被請求的人可以同意／拒絕
drop policy if exists creq_update on public.contact_requests;
create policy creq_update on public.contact_requests for update
  using (target_id = auth.uid());

-- 同意的當下記錄時間
create or replace function public.stamp_contact_response()
returns trigger
language plpgsql
as $fn$
begin
  if new.status <> old.status then
    new.responded_at := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists on_contact_request_responded on public.contact_requests;
create trigger on_contact_request_responded
  before update on public.contact_requests
  for each row execute function public.stamp_contact_response();

-- ------------------------------------------------- 聯絡方式的可見性判斷
-- security definer：policy 內部查 contact_requests 時不要再被它自己的 RLS 卡住
create or replace function public.may_see_contact(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from contact_requests r
    where r.requester_id = auth.uid()
      and r.target_id = owner
      and r.status = 'approved'
  );
$fn$;

-- ★ 換掉 0002 的規則：媒合成立不再自動解鎖，必須對方按過「同意」
drop policy if exists contacts_read on public.contacts;
create policy contacts_read on public.contacts for select
  using (user_id = auth.uid() or public.may_see_contact(user_id));

-- ------------------------------------------------------------ 未讀徽章
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
    )
  );
$fn$;

-- 把一個對話裡別人傳給我的訊息標成已讀
create or replace function public.mark_thread_read(conv uuid)
returns void
language sql
security definer
set search_path = public
as $fn$
  update messages m
     set read_at = now()
   where m.conversation_id = conv
     and m.sender_id <> auth.uid()
     and m.read_at is null
     and exists (
       select 1 from conversations c
        where c.id = conv and (c.user_a = auth.uid() or c.user_b = auth.uid())
     );
$fn$;

-- --------------------------------------------------------- Realtime 訂閱
-- 已經加過的話 add 會報錯，所以先檢查
do $do$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime'
                    and schemaname = 'public' and tablename = 'invites') then
    alter publication supabase_realtime add table public.invites;
  end if;

  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime'
                    and schemaname = 'public' and tablename = 'applications') then
    alter publication supabase_realtime add table public.applications;
  end if;

  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime'
                    and schemaname = 'public' and tablename = 'contact_requests') then
    alter publication supabase_realtime add table public.contact_requests;
  end if;
end
$do$;
