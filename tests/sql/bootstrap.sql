\set ON_ERROR_STOP on
-- Disposable database only; emulate the Supabase roles and auth.uid.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
\ir ../../supabase/migrations/20261110_educational_studio.sql
\ir ../../supabase/migrations/20261110_theme_studio.sql
\ir ../../supabase/migrations/20261111_presentation_templates.sql
\ir ../../supabase/migrations/20261111_hybrid_slide_editor.sql
\ir ../../supabase/migrations/20261119110000_private_lesson_projection.sql
\ir private-lesson-projection.sql
\ir ../../supabase/migrations/20261119140131_teacher_feedback.sql
\ir teacher-feedback.sql
