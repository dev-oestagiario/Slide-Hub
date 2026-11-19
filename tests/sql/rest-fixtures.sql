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


-- F17.4: private records exist for both teachers, to avoid vacuous deny tests.
insert into public.slide_templates(id,owner_id,name) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Tema QA proprietário'),
 ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','Tema QA outro professor');
insert into public.presentation_templates(id,owner_id,name) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Template QA proprietário'),
 ('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','Template QA outro professor');
insert into public.lesson_blocks(lesson_id,position,kind,payload) values
 ('40000000-0000-0000-0000-000000000001',0,'exercise','{"answer":"SEGREDO_BLOCO"}');

commit;
create role authenticator noinherit login password 'slidehub_ci_only';
grant authenticated, anon to authenticator;
