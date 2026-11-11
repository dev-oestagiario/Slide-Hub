-- SlideHub: schema inicial
-- Banco dedicado. A migration correspondente já foi executada no Supabase Dev.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check(role in ('student','teacher','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 2 and 180),
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 2 and 180),
  description text not null default '',
  position integer not null default 0 check(position>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.slide_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 2 and 100),
  config jsonb not null default '{}'::jsonb check(jsonb_typeof(config)='object'),
  created_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 2 and 180),
  markdown text not null default '',
  status text not null default 'draft' check(status in ('draft','published')),
  position integer not null default 0 check(position>=0),
  template_id uuid references public.slide_templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.speaker_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  slide_index integer not null check(slide_index>=0),
  notes text not null default '',
  unique (lesson_id,slide_index)
);
create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position integer not null check(position>=0),
  kind text not null check(kind in ('markdown','code','diagram','exercise','slide_break')),
  payload jsonb not null default '{}'::jsonb,
  unique (lesson_id,position)
);
create index if not exists disciplines_owner_idx on public.disciplines(owner_id);
create index if not exists modules_discipline_position_idx on public.modules(discipline_id,position);
create index if not exists lessons_module_position_idx on public.lessons(module_id,position);
create index if not exists slide_templates_owner_idx on public.slide_templates(owner_id);
create schema if not exists private;
create or replace function private.create_profile_for_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'student')
  on conflict(id) do nothing;
  return new;
end; $$;
revoke all on function private.create_profile_for_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile_for_user();
create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end; $$;
revoke all on function private.touch_updated_at() from public,anon,authenticated;
drop trigger if exists disciplines_touch on public.disciplines;
drop trigger if exists modules_touch on public.modules;
drop trigger if exists lessons_touch on public.lessons;
create trigger disciplines_touch before update on public.disciplines for each row execute function private.touch_updated_at();
create trigger modules_touch before update on public.modules for each row execute function private.touch_updated_at();
create trigger lessons_touch before update on public.lessons for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.disciplines enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.slide_templates enable row level security;
alter table public.speaker_notes enable row level security;
alter table public.lesson_blocks enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using(id=(select auth.uid()));

drop policy if exists disciplines_read on public.disciplines;
drop policy if exists disciplines_insert on public.disciplines;
drop policy if exists disciplines_update on public.disciplines;
drop policy if exists disciplines_delete on public.disciplines;
create policy disciplines_read on public.disciplines for select to authenticated using(owner_id=(select auth.uid()) or is_public);
create policy disciplines_insert on public.disciplines for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin')));
create policy disciplines_update on public.disciplines for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy disciplines_delete on public.disciplines for delete to authenticated using(owner_id=(select auth.uid()));

drop policy if exists modules_read on public.modules;
drop policy if exists modules_insert on public.modules;
drop policy if exists modules_update on public.modules;
drop policy if exists modules_delete on public.modules;
create policy modules_read on public.modules for select to authenticated using(exists(select 1 from public.disciplines d where d.id=discipline_id and (d.owner_id=(select auth.uid()) or d.is_public)));
create policy modules_insert on public.modules for insert to authenticated with check(exists(select 1 from public.disciplines d where d.id=discipline_id and d.owner_id=(select auth.uid())));
create policy modules_update on public.modules for update to authenticated using(exists(select 1 from public.disciplines d where d.id=discipline_id and d.owner_id=(select auth.uid()))) with check(exists(select 1 from public.disciplines d where d.id=discipline_id and d.owner_id=(select auth.uid())));
create policy modules_delete on public.modules for delete to authenticated using(exists(select 1 from public.disciplines d where d.id=discipline_id and d.owner_id=(select auth.uid())));

drop policy if exists lessons_read on public.lessons;
drop policy if exists lessons_insert on public.lessons;
drop policy if exists lessons_update on public.lessons;
drop policy if exists lessons_delete on public.lessons;
create policy lessons_read on public.lessons for select to authenticated using(exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id where m.id=module_id and (d.owner_id=(select auth.uid()) or (d.is_public and status='published'))));
create policy lessons_insert on public.lessons for insert to authenticated with check(exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id where m.id=module_id and d.owner_id=(select auth.uid())));
create policy lessons_update on public.lessons for update to authenticated using(exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id where m.id=module_id and d.owner_id=(select auth.uid()))) with check(exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id where m.id=module_id and d.owner_id=(select auth.uid())));
create policy lessons_delete on public.lessons for delete to authenticated using(exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id where m.id=module_id and d.owner_id=(select auth.uid())));

drop policy if exists templates_read on public.slide_templates;
drop policy if exists templates_insert on public.slide_templates;
drop policy if exists templates_update on public.slide_templates;
drop policy if exists templates_delete on public.slide_templates;
create policy templates_read on public.slide_templates for select to authenticated using(owner_id=(select auth.uid()));
create policy templates_insert on public.slide_templates for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('teacher','admin')));
create policy templates_update on public.slide_templates for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy templates_delete on public.slide_templates for delete to authenticated using(owner_id=(select auth.uid()));

drop policy if exists notes_teacher_all on public.speaker_notes;
create policy notes_teacher_all on public.speaker_notes for all to authenticated
using(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.disciplines d on d.id=m.discipline_id where l.id=lesson_id and d.owner_id=(select auth.uid())))
with check(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.disciplines d on d.id=m.discipline_id where l.id=lesson_id and d.owner_id=(select auth.uid())));
drop policy if exists blocks_teacher_all on public.lesson_blocks;
create policy blocks_teacher_all on public.lesson_blocks for all to authenticated
using(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.disciplines d on d.id=m.discipline_id where l.id=lesson_id and d.owner_id=(select auth.uid())))
with check(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.disciplines d on d.id=m.discipline_id where l.id=lesson_id and d.owner_id=(select auth.uid())));
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update,delete on public.disciplines,public.modules,public.lessons,public.slide_templates,public.speaker_notes,public.lesson_blocks to authenticated;
revoke all on public.profiles,public.disciplines,public.modules,public.lessons,public.slide_templates,public.speaker_notes,public.lesson_blocks from anon;
