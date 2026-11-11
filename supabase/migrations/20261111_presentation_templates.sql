-- SlideHub F2: presentation templates independent from legacy theme presets.
-- Additive migration. Run in a controlled Supabase environment after review.
create table if not exists public.presentation_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 320),
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists presentation_templates_owner_updated_idx
  on public.presentation_templates(owner_id, updated_at desc);
create index if not exists lessons_template_id_idx on public.lessons(template_id);

alter table public.lessons
  add column if not exists presentation_template_id uuid
    references public.presentation_templates(id) on delete set null,
  add column if not exists presentation_template_snapshot jsonb
    not null default '{}'::jsonb
    check (jsonb_typeof(presentation_template_snapshot) = 'object');
create index if not exists lessons_presentation_template_idx
  on public.lessons(presentation_template_id);

create or replace function private.touch_presentation_template() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end $$;
revoke all on function private.touch_presentation_template() from public, anon, authenticated;
drop trigger if exists presentation_templates_touch on public.presentation_templates;
create trigger presentation_templates_touch before update on public.presentation_templates
for each row execute function private.touch_presentation_template();

-- Prevent assigning another teacher's personal template to an otherwise owned lesson,
-- even if the caller discovers or guesses a template UUID. Do not use user_metadata for roles.
create or replace function private.validate_lesson_presentation_template() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.presentation_template_id is not null
    and not exists (
      select 1 from public.presentation_templates pt
      join public.modules m on m.id = new.module_id
      join public.disciplines d on d.id = m.discipline_id
      where pt.id = new.presentation_template_id
        and pt.owner_id = d.owner_id
    ) then
    raise exception 'Template inválido para a disciplina desta aula'
      using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.validate_lesson_presentation_template() from public, anon, authenticated;
drop trigger if exists lessons_validate_presentation_template on public.lessons;
create trigger lessons_validate_presentation_template
before insert or update of presentation_template_id, module_id
on public.lessons for each row execute function private.validate_lesson_presentation_template();

alter table public.presentation_templates enable row level security;
drop policy if exists presentation_templates_owner_select on public.presentation_templates;
drop policy if exists presentation_templates_owner_insert on public.presentation_templates;
drop policy if exists presentation_templates_owner_update on public.presentation_templates;
drop policy if exists presentation_templates_owner_delete on public.presentation_templates;
create policy presentation_templates_owner_select on public.presentation_templates
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy presentation_templates_owner_insert on public.presentation_templates
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists(select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('teacher','admin'))
  );
create policy presentation_templates_owner_update on public.presentation_templates
  for update to authenticated
  using (owner_id = (select auth.uid())
    and exists(select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('teacher','admin')))
  with check (owner_id = (select auth.uid())
    and exists(select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('teacher','admin')));
create policy presentation_templates_owner_delete on public.presentation_templates
  for delete to authenticated
  using (owner_id = (select auth.uid())
    and exists(select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('teacher','admin')));

revoke all on table public.presentation_templates from anon, authenticated;
grant select, insert, update, delete on table public.presentation_templates to authenticated;
