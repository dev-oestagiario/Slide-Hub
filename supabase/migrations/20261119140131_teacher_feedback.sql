-- Only delivery metadata; no feedback content is stored.
create table private.teacher_feedback_delivery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  issue_number integer check (issue_number > 0),
  primary key(user_id,request_id)
);
alter table private.teacher_feedback_delivery enable row level security;
revoke all on private.teacher_feedback_delivery from public,anon,authenticated;
create index teacher_feedback_created_idx on private.teacher_feedback_delivery(created_at);
create function public.claim_teacher_feedback(p_user uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare found_row private.teacher_feedback_delivery%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_user and role in ('teacher','admin')) then
  return '{"state":"forbidden"}'::jsonb;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(76281482);
 delete from private.teacher_feedback_delivery where created_at < now()-interval '30 days';
 select * into found_row from private.teacher_feedback_delivery where user_id=p_user and request_id=p_request;
 if found then
  if found_row.issue_number is not null then return jsonb_build_object('state','sent','number',found_row.issue_number);end if;
  return '{"state":"pending"}'::jsonb;
 end if;
 if (select count(*) from private.teacher_feedback_delivery where user_id=p_user and created_at>=now()-interval '1 hour')>=5
 or (select count(*) from private.teacher_feedback_delivery where created_at>=now()-interval '1 hour')>=50 then
  return '{"state":"limit"}'::jsonb;
 end if;
 insert into private.teacher_feedback_delivery(user_id,request_id) values(p_user,p_request);
 return '{"state":"claimed"}'::jsonb;
end $$;
revoke all on function public.claim_teacher_feedback(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_teacher_feedback(uuid,uuid) to service_role;
create function public.finish_teacher_feedback(p_user uuid,p_request uuid,p_number integer)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_number is null or p_number<=0 then raise exception 'Invalid issue number'; end if;
 update private.teacher_feedback_delivery set issue_number=p_number
 where user_id=p_user and request_id=p_request and issue_number is null;
 return found;
end $$;
revoke all on function public.finish_teacher_feedback(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.finish_teacher_feedback(uuid,uuid,integer) to service_role;
