\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
update public.profiles set role='teacher' where id in ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003');
insert into public.disciplines(id,owner_id,title,is_public) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Disciplina pública',true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Disciplina privada',false);
insert into public.modules(id,discipline_id,title) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Módulo 1'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Módulo 2');
insert into public.lessons(id,module_id,title,markdown,status,editor_layout) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Aula publicada',
 E'# Aula\n\nTexto público\n\n:::answer\nSEGREDO_RESPOSTA\n## Título privado\n<!-- slide -->\n~~~js\n:::\nSEGREDO_FENCE\n~~~\n  :::\nSEGREDO_INDENTADO\n:::\n\nTexto final\n\n:::answer\nSEGREDO_SEM_FECHAMENTO',
 'published',
 '{"schemaVersion":1,"blocks":[{"id":"block-0001","kind":"heading","slideIndex":0,"markdown":"# Aula","secret":"SEGREDO_CAMPO"},{"id":"block-0002","kind":"paragraph","slideIndex":0,"markdown":"SEGREDO_RESPOSTA"},{"id":"block-0003","kind":"paragraph","slideIndex":0,"markdown":"Texto público"}],"overrides":{"block-0001":{"x":0.1,"y":0.1,"w":0.4,"h":0.2,"z":1,"style":{"color":"#123456","font":"serif","unknown":"SEGREDO_ESTILO"}},"block-0002":{"x":0,"y":0,"w":1,"h":1,"z":2}},"motion":{"elements":{"block-0001":{"effect":"fade","order":1,"duration":350,"secret":"SEGREDO_MOTION"},"block-0002":{"effect":"rise","order":2}}},"unknown":"SEGREDO_CACHE"}'),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','Rascunho','SEGREDO_RASCUNHO','draft','{}'),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','Aula privada','SEGREDO_DISCIPLINA','published','{}');
insert into public.speaker_notes(lesson_id,slide_index,notes) values ('40000000-0000-0000-0000-000000000001',0,'SEGREDO_NOTA');

-- A permissive policy accidentally added later must not bypass the raw-row guard.
create policy test_permissive_read on public.lessons for select to authenticated using(true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
declare result jsonb; n integer;
begin
  if (select count(*) from public.lessons)<>0 then raise exception 'student read raw rows';end if;
  if (select count(*) from public.speaker_notes)<>0 then raise exception 'student read notes';end if;
  select count(*) into n from public.list_accessible_lessons();
  if n<>1 then raise exception 'student expected one published public lesson, got %',n;end if;
  select value into result from public.list_accessible_lessons() as value;
  if result::text like '%SEGREDO_%' then raise exception 'student projection leaked private content';end if;
  if result->>'markdown' not like '%Texto final%' or result->>'markdown' not like '%Texto público%' then raise exception 'public content lost';end if;
  if jsonb_array_length(result->'editor_layout'->'blocks')<>2 or result#>>'{editor_layout,overrides,block-0001,style,color}' is distinct from '#123456' or result#>>'{editor_layout,motion,elements,block-0001,effect}' is distinct from 'fade' then raise exception 'public layout lost';end if;
  update public.lessons set title='Tentativa' where id='40000000-0000-0000-0000-000000000001';
  if found then raise exception 'student modified lesson';end if;
  begin
    insert into public.lessons(module_id,title) values ('30000000-0000-0000-0000-000000000001','Tentativa');
    raise exception 'student inserted lesson';
  exception when insufficient_privilege then null;end;
end $$;

-- Other teachers have reader privileges on a public class, not ownership.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$begin
 if (select count(*) from public.lessons)<>0 or (select count(*) from public.list_accessible_lessons())<>1 then raise exception 'other teacher ownership bypass';end if;
 if exists(select 1 from public.list_accessible_lessons() x where x::text like '%SEGREDO_%') then raise exception 'other teacher saw private content';end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare rev bigint; n integer;
begin
 if (select count(*) from public.lessons)<>3 or (select count(*) from public.list_accessible_lessons())<>3 then raise exception 'owner missing lessons';end if;
 if not exists(select 1 from public.list_accessible_lessons() x where x->>'markdown' like '%SEGREDO_RESPOSTA%') then raise exception 'owner answer lost';end if;
 if (select count(*) from public.speaker_notes)<>1 then raise exception 'owner missing notes';end if;
 select editor_revision into rev from public.lessons where id='40000000-0000-0000-0000-000000000001';
 update public.lessons set title='Aula salva' where id='40000000-0000-0000-0000-000000000001' and editor_revision=rev;
 if not found then raise exception 'owner update failed';end if;
 update public.lessons set title='Revisão obsoleta' where id='40000000-0000-0000-0000-000000000001' and editor_revision=rev;
 if found then raise exception 'stale revision accepted';end if;
 if (select editor_revision from public.lessons where id='40000000-0000-0000-0000-000000000001')<>rev+1 then raise exception 'revision not incremented';end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$begin if exists(select 1 from public.list_accessible_lessons()) then raise exception 'null caller read lessons';end if;end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.list_accessible_lessons()','EXECUTE') then raise exception 'anon can execute RPC';end if;
 if has_function_privilege('authenticated','private.public_lesson_layout(jsonb,text)','EXECUTE') then raise exception 'helper exposed';end if;
 if private.public_lesson_markdown(E'~~~md\n:::answer\nliteral público\n:::\n~~~') not like '%literal público%' then raise exception 'code fence literal lost';end if;
 if private.public_lesson_markdown(E':::answer\n~~~\n:::\nSEGREDO') like '%SEGREDO%' then raise exception 'unclosed fence in answer leaked';end if;
end $$;
rollback;
\echo F16 SQL security and revision assertions passed
