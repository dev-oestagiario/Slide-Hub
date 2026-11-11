-- F4: geometry and stable slide notes; additive and reviewable.
-- Requires F2 migration first. Do not run automatically on production.
alter table public.lessons
 add column if not exists editor_layout jsonb not null default '{"schemaVersion":1,"blocks":[],"overrides":{}}'::jsonb
 check (jsonb_typeof(editor_layout)='object'),
 add column if not exists editor_revision bigint not null default 0 check(editor_revision>=0);
-- Unique monotonic revision for text/layout changes only (template updates do not invalidate autosave).
create or replace function private.bump_lesson_editor_revision() returns trigger
language plpgsql set search_path='' as $$
begin
 if (new.markdown is distinct from old.markdown
     or new.title is distinct from old.title
     or new.editor_layout is distinct from old.editor_layout)
 then
   new.editor_revision = old.editor_revision + 1;
 else
   new.editor_revision = old.editor_revision;
 end if;
 return new;
end $$;
revoke all on function private.bump_lesson_editor_revision() from public,anon,authenticated;
drop trigger if exists lessons_editor_revision on public.lessons;
create trigger lessons_editor_revision before update on public.lessons
for each row execute function private.bump_lesson_editor_revision();

-- Slide notes become keyed by the stable first block ID, rather than the numeric position.
alter table public.speaker_notes add column if not exists slide_key text;
create unique index if not exists speaker_notes_slide_key_unique
 on public.speaker_notes(lesson_id,slide_key) where slide_key is not null;
-- Preserve the old (lesson_id, slide_index) uniqueness constraint.
-- Older deployed clients still upsert on that key. New clients identify notes by
-- slide_key and allocate a spare legacy index when the visual index is occupied.
create index if not exists speaker_notes_lesson_index_idx on public.speaker_notes(lesson_id,slide_index);
-- Enforce well-formed IDs when supplied; legacy rows may have NULL.
alter table public.speaker_notes
 add constraint speaker_notes_slide_key_format
 check (slide_key is null or (length(slide_key) between 8 and 80 and slide_key ~ '^[A-Za-z0-9-]+$'));
-- Existing RLS on lessons/speaker_notes continues unchanged.
