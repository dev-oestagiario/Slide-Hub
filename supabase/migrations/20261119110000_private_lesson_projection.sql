-- F16: remove raw lesson reads from non-owners; expose a server-filtered projection.
-- Apply only after staging verification and a coordinated client rollout.
create or replace function private.public_lesson_markdown(source text)
returns text language plpgsql immutable set search_path='' as $$
declare
  line text; mark text; fence text:=''; in_answer boolean:=false;
  kept text[]:='{}';
begin
  foreach line in array pg_catalog.string_to_array(pg_catalog.replace(pg_catalog.replace(coalesce(source,''),E'\r\n',E'\n'),E'\r',E'\n'),E'\n')
  loop
    mark := (pg_catalog.regexp_match(line,'^[[:space:]]*(\x60{3,}|~{3,})'))[1];
    if mark is not null then
      if fence='' then fence:=mark;
      elsif pg_catalog.left(fence,1)=pg_catalog.left(mark,1) and pg_catalog.length(mark)>=pg_catalog.length(fence) then fence:=''; end if;
      if not in_answer then kept:=pg_catalog.array_append(kept,line);end if;
      continue;
    end if;
    if fence='' then
      if in_answer then
        if line ~ '^:::[[:space:]]*$' then in_answer:=false;end if;
        continue;
      end if;
      if line ~ '^[[:space:]]*:::answer[[:space:]]*$' then in_answer:=true;continue;end if;
    end if;
    if not in_answer then kept:=pg_catalog.array_append(kept,line);end if;
  end loop;
  return pg_catalog.array_to_string(kept,E'\n');
end $$;

-- Only copy values recognized by the renderer. Unknown fields and cached text not
-- present in the public source never cross the API boundary.
create or replace function private.public_lesson_layout(raw jsonb, visible text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare
  b jsonb; id text; txt text; safe_blocks jsonb:='[]'; ids text[]:='{}';
  rect jsonb; style jsonb; safe_rect jsonb; safe_style jsonb; safe_overrides jsonb:='{}';
  entry jsonb; safe_entry jsonb; safe_elements jsonb:='{}'; safe_transitions jsonb:='{}'; safe_timings jsonb:='{}';
  field text;
begin
  for b in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(raw->'blocks')='array' then raw->'blocks' else '[]'::jsonb end
  ) limit 2000 loop
    id:=b->>'id';txt:=b->>'markdown';
    if id is null or id !~ '^[a-zA-Z0-9-]{8,80}$' or id=any(ids)
      or pg_catalog.jsonb_typeof(b->'markdown') is distinct from 'string'
      or txt is null or pg_catalog.length(txt) not between 1 and 50000
      or pg_catalog.strpos(visible,txt)=0
      or pg_catalog.jsonb_typeof(b->'slideIndex') is distinct from 'number'
      or (b->>'slideIndex') !~ '^[0-9]{1,6}$'
      or coalesce(b->>'kind','') not in ('heading','paragraph','list','image','quote','table','code')
    then continue;end if;
    ids:=pg_catalog.array_append(ids,id);
    safe_blocks:=safe_blocks||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id',id,'kind',b->>'kind','markdown',txt,'slideIndex',b->'slideIndex'));
    rect:=raw->'overrides'->id;
    if pg_catalog.jsonb_typeof(rect)='object'
      and pg_catalog.jsonb_typeof(rect->'x')='number' and pg_catalog.jsonb_typeof(rect->'y')='number'
      and pg_catalog.jsonb_typeof(rect->'w')='number' and pg_catalog.jsonb_typeof(rect->'h')='number'
      and pg_catalog.jsonb_typeof(rect->'z')='number' then
      safe_rect:=pg_catalog.jsonb_build_object('x',rect->'x','y',rect->'y','w',rect->'w','h',rect->'h','z',rect->'z');
      if pg_catalog.jsonb_typeof(rect->'rotation')='number' then safe_rect:=safe_rect||pg_catalog.jsonb_build_object('rotation',rect->'rotation');end if;
      style:=rect->'style';safe_style:='{}';
      foreach field in array array['size','borderWidth','radius','opacity','imageX','imageY'] loop
        if pg_catalog.jsonb_typeof(style->field)='number' then safe_style:=safe_style||pg_catalog.jsonb_build_object(field,style->field);end if;
      end loop;
      foreach field in array array['color','background','borderColor'] loop
        if (style->>field) ~ '^#[0-9a-fA-F]{6}$' then safe_style:=safe_style||pg_catalog.jsonb_build_object(field,style->field);end if;
      end loop;
      if style->>'font' in ('system','serif','mono') then safe_style:=safe_style||pg_catalog.jsonb_build_object('font',style->'font');end if;
      if style->>'imageFit' in ('contain','cover') then safe_style:=safe_style||pg_catalog.jsonb_build_object('imageFit',style->'imageFit');end if;
      if safe_style<>'{}'::jsonb then safe_rect:=safe_rect||pg_catalog.jsonb_build_object('style',safe_style);end if;
      safe_overrides:=safe_overrides||pg_catalog.jsonb_build_object(id,safe_rect);
    end if;
    entry:=raw->'motion'->'elements'->id;
    if entry->>'effect' in ('fade','rise','zoom','slide') then
      safe_entry:=pg_catalog.jsonb_build_object('effect',entry->'effect');
      foreach field in array array['order','duration','delay','exitDuration','exitDelay','exitOrder'] loop
        if pg_catalog.jsonb_typeof(entry->field)='number' then safe_entry:=safe_entry||pg_catalog.jsonb_build_object(field,entry->field);end if;
      end loop;
      if entry->>'exit' in ('fade','rise','zoom','slide') then safe_entry:=safe_entry||pg_catalog.jsonb_build_object('exit',entry->'exit');end if;
      safe_elements:=safe_elements||pg_catalog.jsonb_build_object(id,safe_entry);
    end if;
    if raw->'motion'->'transitions'->>id in ('fade','slide','zoom') then
      safe_transitions:=safe_transitions||pg_catalog.jsonb_build_object(id,raw->'motion'->'transitions'->id);
    end if;
    entry:=raw->'motion'->'timings'->id;
    safe_entry:='{}';
    foreach field in array array['hold','transitionDuration'] loop
      if pg_catalog.jsonb_typeof(entry->field)='number' then safe_entry:=safe_entry||pg_catalog.jsonb_build_object(field,entry->field);end if;
    end loop;
    if safe_entry<>'{}'::jsonb then safe_timings:=safe_timings||pg_catalog.jsonb_build_object(id,safe_entry);end if;
  end loop;
  return pg_catalog.jsonb_build_object('schemaVersion',1,'blocks',safe_blocks,'overrides',safe_overrides,
    'motion',pg_catalog.jsonb_build_object('elements',safe_elements,'transitions',safe_transitions,'timings',safe_timings));
end $$;
revoke all on function private.public_lesson_markdown(text) from public,anon,authenticated;
revoke all on function private.public_lesson_layout(jsonb,text) from public,anon,authenticated;

-- Owner read + restrictive guard (also protects against other permissive SELECT policies).
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select to authenticated using (
 exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
 where m.id=module_id and d.owner_id=(select auth.uid()))
);
drop policy if exists lessons_raw_owner_guard on public.lessons;
create policy lessons_raw_owner_guard on public.lessons as restrictive for select to authenticated using (
 exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
 where m.id=module_id and d.owner_id=(select auth.uid()))
);

-- Caller identity comes only from auth.uid(). No caller-provided owner/role/lesson ID.
-- Explicit allowlist for non-owner fields; never return the raw row to non-owners.
create or replace function public.list_accessible_lessons()
returns setof jsonb language sql stable security definer set search_path='' as $$
 select case when d.owner_id=auth.uid() then pg_catalog.to_jsonb(l)
 else pg_catalog.jsonb_build_object(
  'id',l.id,'module_id',l.module_id,'title',l.title,'status',l.status,
  'position',l.position,'template_id',l.template_id,'updated_at',l.updated_at,
  'theme_config',l.theme_config,'presentation_template_snapshot',l.presentation_template_snapshot,
  'editor_revision',l.editor_revision,'markdown',v.visible,
  'editor_layout',private.public_lesson_layout(l.editor_layout,v.visible))
 end
 from public.lessons l
 join public.modules m on m.id=l.module_id
 join public.disciplines d on d.id=m.discipline_id
 cross join lateral (select private.public_lesson_markdown(l.markdown) as visible) v
 where auth.uid() is not null and
 (d.owner_id=auth.uid() or (d.is_public and l.status='published'))
 order by l.position,l.id
$$;
revoke all on function public.list_accessible_lessons() from public,anon,authenticated;
grant execute on function public.list_accessible_lessons() to authenticated;

-- Mutations require both ownership and a database-managed teacher/admin role.
do $$
declare p text;
begin
  foreach p in array array['lessons_insert','lessons_update','lessons_delete'] loop
    execute pg_catalog.format('drop policy if exists %I on public.lessons',p);
  end loop;
end $$;
create policy lessons_insert on public.lessons for insert to authenticated with check (
  exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
    join public.profiles p on p.id=d.owner_id where m.id=module_id and d.owner_id=(select auth.uid()) and p.role in ('teacher','admin'))
);
create policy lessons_update on public.lessons for update to authenticated using (
  exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
    join public.profiles p on p.id=d.owner_id where m.id=module_id and d.owner_id=(select auth.uid()) and p.role in ('teacher','admin'))
) with check (
  exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
    join public.profiles p on p.id=d.owner_id where m.id=module_id and d.owner_id=(select auth.uid()) and p.role in ('teacher','admin'))
);
create policy lessons_delete on public.lessons for delete to authenticated using (
  exists(select 1 from public.modules m join public.disciplines d on d.id=m.discipline_id
    join public.profiles p on p.id=d.owner_id where m.id=module_id and d.owner_id=(select auth.uid()) and p.role in ('teacher','admin'))
);
