\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
update public.profiles set role='teacher' where id='10000000-0000-0000-0000-000000000001';
do $$
begin
 if has_function_privilege('authenticated','public.claim_teacher_feedback(uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.claim_teacher_feedback(uuid,uuid)','EXECUTE') then raise exception 'claim exposed';end if;
 if has_function_privilege('authenticated','public.finish_teacher_feedback(uuid,uuid,integer)','EXECUTE') then raise exception 'finish exposed';end if;
 if has_table_privilege('authenticated','private.teacher_feedback_delivery','SELECT') then raise exception 'receipt exposed';end if;
end $$;
set local role service_role;
do $$
declare teacher uuid:='10000000-0000-0000-0000-000000000001';student uuid:='10000000-0000-0000-0000-000000000002';rid uuid:='00000000-0000-4000-8000-000000000001';r jsonb;
begin
 if public.claim_teacher_feedback(student,rid)->>'state'<>'forbidden' then raise exception 'student claim';end if;
 if public.claim_teacher_feedback(teacher,rid)->>'state'<>'claimed' then raise exception 'claim failed';end if;
 if public.claim_teacher_feedback(teacher,rid)->>'state'<>'pending' then raise exception 'duplicate claim';end if;
 if not public.finish_teacher_feedback(teacher,rid,42) then raise exception 'receipt failed';end if;
 r:=public.claim_teacher_feedback(teacher,rid);
 if r->>'state'<>'sent' or (r->>'number')::int<>42 then raise exception 'receipt mismatch';end if;
 for i in 2..5 loop
  if public.claim_teacher_feedback(teacher,gen_random_uuid())->>'state'<>'claimed' then raise exception 'quota early';end if;
 end loop;
 if public.claim_teacher_feedback(teacher,gen_random_uuid())->>'state'<>'limit' then raise exception 'quota exceeded';end if;
end $$;
reset role;
rollback;
\echo Teacher feedback authorization and delivery assertions passed
