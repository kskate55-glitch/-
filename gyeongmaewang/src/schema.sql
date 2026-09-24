-- 경매왕 — Supabase 스키마 (SQL Editor에 통째로 붙여넣고 Run 한 번)
-- 원칙: 모든 개인 데이터는 user_id = auth.uid() 인 본인 것만 읽고 쓴다(RLS).
--       이름·생년월일·전화번호·주소·실제 이메일·성별은 저장하지 않는다.

-- 1) 프로필 — 아이디와 "시작한 이유" 하나뿐
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{4,16}$'),
  reason     text not null check (reason in ('investing','studying','curious','fun','other')),
  created_at timestamptz not null default now()
);

-- 2) 게임 저장 — 진행·업적·도감·NPC 기억·통계·설정을 한 문서(jsonb)로.
--    한 번에 통째로 저장해야 "업적은 저장됐는데 돈은 안 저장됨" 같은 반쪽 저장이 안 생긴다.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb  not null check (pg_column_size(state) < 3000000),
  updated    bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 3) 이탈 통계 — 쓰기만 가능(본인 것도 다시 못 읽는다). 개인정보 없음.
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) <= 40),
  props      jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists events_name_time on public.events (name, created_at);

alter table public.profiles enable row level security;
alter table public.saves    enable row level security;
alter table public.events   enable row level security;

-- profiles: 본인만
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile delete" on public.profiles;
create policy "own profile select" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own profile delete" on public.profiles for delete to authenticated using (user_id = (select auth.uid()));

-- saves: 본인만
drop policy if exists "own save select" on public.saves;
drop policy if exists "own save insert" on public.saves;
drop policy if exists "own save update" on public.saves;
drop policy if exists "own save delete" on public.saves;
create policy "own save select" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "own save insert" on public.saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own save update" on public.saves for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own save delete" on public.saves for delete to authenticated using (user_id = (select auth.uid()));

-- events: 본인 이름으로 넣기만. select/update/delete 정책 없음 = 아무도 못 읽는다(관리자 SQL Editor만).
drop policy if exists "own event insert" on public.events;
create policy "own event insert" on public.events for insert to authenticated with check (user_id = (select auth.uid()));

-- 로그인 안 한 방문자(anon 역할)는 어떤 표도 못 건드린다
revoke all on public.profiles, public.saves, public.events from anon;

-- ─────────────────────────────────────────────────────────────
-- 📊 이탈 퍼널 보기 — 뷰로 만들지 말고 SQL Editor에서 직접 실행한다
--    (뷰는 만든 사람 권한으로 돌아 RLS를 건너뛸 수 있어 위험하다)
--
-- select props->>'case' as case_id, props->>'step' as step,
--        count(distinct user_id) as players
--   from public.events
--  where name = 'case_step' and created_at > now() - interval '7 days'
--  group by 1, 2
--  order by 1, array_position(array['research','bid','won','lost','evict','crossroad','repair','sell','result'], props->>'step');
--
-- 체험 → 가입 전환:
-- select count(*) filter (where name='upgrade_prompt') as prompts,
--        count(*) filter (where name='signup' and (props->>'from_trial')::boolean) as upgraded
--   from public.events where created_at > now() - interval '7 days';
