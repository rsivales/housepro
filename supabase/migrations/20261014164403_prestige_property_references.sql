-- HousePro Prestige: HP<agency><city><agent:2>-<sequence:2+>.
-- UUIDs and relationships remain unchanged. Historical portal references win.
alter table public.agencies add column reference_city_code smallint check(reference_city_code between 1 and 9);
alter table public.properties add column reference_aliases text[] not null default '{}';

update public.agencies set code=1,reference_city_code=1,next_agent_code=greatest(next_agent_code,3) where id='f515ccc5-0db4-4a3a-8f84-e2c674e68928';
-- Brand administration is not a commercial consultant.
update public.profiles set code=null where id='155ec593-d355-4205-9a7b-73fb63e36607';
update public.profiles set code=1,next_property_seq=greatest(next_property_seq,406) where id='8f2d59dd-aedf-45ff-a8ef-04809208f1a0';
update public.profiles set code=2,next_property_seq=1 where id='bbf44cff-5c18-4927-842b-c379803eafb2';

-- The 455,000 EUR terrace apartment matches the historical HP1101-404 listing.
update public.properties set legacy_reference='HP1101-404' where id='88337c0c-4205-470c-90aa-f9abb270402d' and legacy_reference is null;
-- Existing imported references stay intact even after consultant reassignment.
do $$
declare p record;
begin
 for p in select id,reference,legacy_reference from public.properties where legacy_reference is not null and legacy_reference<>reference and agent_id in ('8f2d59dd-aedf-45ff-a8ef-04809208f1a0','bbf44cff-5c18-4927-842b-c379803eafb2') loop
  if exists(select 1 from public.properties where reference=p.legacy_reference and id<>p.id) then raise exception 'reference_already_exists: %',p.legacy_reference; end if;
  update public.properties set reference=legacy_reference,reference_aliases=array_append(reference_aliases,reference) where id=p.id;
  insert into public.property_audit(property_id,property_ref,actor_id,actor_name,actor_role,action,changes) values(p.id,p.legacy_reference,'8f2d59dd-aedf-45ff-a8ef-04809208f1a0','Rodrigo Silva','superadmin','editou',jsonb_build_array(jsonb_build_object('field','Referência','from',p.reference,'to',p.legacy_reference)));
 end loop;
end; $$;

create or replace function public.next_property_seq(p_agent uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare a public.profiles; ag public.agencies; prefix text; n integer; high integer;
begin
 if current_setting('role',true) in ('anon','authenticated') and (auth.uid() is null or auth.uid()<>p_agent) then raise exception 'forbidden'; end if;
 select * into a from public.profiles where id=p_agent and active is distinct from false for update;
 if not found or a.code is null then raise exception 'reference_configuration_missing'; end if;
 select * into ag from public.agencies where id=a.agency_id;
 if ag.reference_city_code is not null then
  if ag.code is null or a.code not between 1 and 99 then raise exception 'reference_configuration_missing'; end if;
  prefix='HP'||ag.code||ag.reference_city_code||lpad(a.code::text,2,'0');
 else
  prefix='HP'||coalesce(ag.code,0)||lpad(a.code::text,greatest(3,length(a.code::text)),'0');
 end if;
 select coalesce(max(substring(ref from length(prefix)+2)::integer),0) into high from (
  select reference ref from public.properties union all select legacy_reference from public.properties union all select unnest(reference_aliases) from public.properties
 ) refs where ref ~ ('^'||prefix||'-[0-9]{2,}$');
 n=greatest(a.next_property_seq,high+1);
 update public.profiles set next_property_seq=n+1 where id=p_agent;
 return n;
end; $$;
revoke all on function public.next_property_seq(uuid) from public,anon;
grant execute on function public.next_property_seq(uuid) to authenticated,service_role;

-- A private trigger makes all insert paths agree, including the older client
-- during deployment and the existing atomic batch duplicator.
create or replace function helix_private.assign_property_reference() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.profiles; ag public.agencies; prefix text; previous_prefix text; n integer; supplied text; actor uuid; caps jsonb;
begin
 if TG_OP='UPDATE' then
  if new.reference is distinct from old.reference then
   if current_setting('role',true) in ('anon','authenticated') then raise exception 'reference_is_immutable'; end if;
   new.reference_aliases=array(select distinct unnest(new.reference_aliases||array[old.reference]));
  end if;
  return new;
 end if;
 select * into a from public.profiles where id=new.agent_id and active is distinct from false for update;
 if not found or a.code is null then raise exception 'reference_configuration_missing'; end if;
 select * into ag from public.agencies where id=a.agency_id;
 if ag.reference_city_code is null then return new; end if;
 if ag.code is null or a.code not between 1 and 99 then raise exception 'reference_configuration_missing'; end if;
 if current_setting('role',true) in ('anon','authenticated') then
  actor=auth.uid(); if actor is null or actor<>new.agent_id then raise exception 'forbidden_assignment'; end if;
 end if;
 prefix='HP'||ag.code||ag.reference_city_code||lpad(a.code::text,2,'0');
 previous_prefix='HP'||ag.code||lpad(a.code::text,greatest(3,length(a.code::text)),'0');
 supplied=nullif(btrim(new.reference),'');
 if nullif(btrim(new.legacy_reference),'') is not null then
  new.reference=btrim(new.legacy_reference);
 elsif supplied ~ ('^'||prefix||'-[0-9]{2,}$') or supplied ~ ('^'||previous_prefix||'-[0-9]{2,}$') then
  n=substring(supplied from '-([0-9]+)$')::integer;
  if n<1 then raise exception 'invalid_reference_sequence'; end if;
  new.reference=prefix||'-'||lpad(n::text,greatest(2,length(n::text)),'0');
  update public.profiles set next_property_seq=greatest(next_property_seq,n+1) where id=a.id;
 else
  n=public.next_property_seq(a.id);
  new.reference=prefix||'-'||lpad(n::text,greatest(2,length(n::text)),'0');
 end if;
 if exists(select 1 from public.properties p where p.reference=new.reference or p.legacy_reference=new.reference or new.reference=any(p.reference_aliases)) then raise exception 'reference_already_exists: %',new.reference; end if;
 if supplied is not null and supplied<>new.reference then new.reference_aliases=array_append(new.reference_aliases,supplied); end if;
 return new;
end; $$;
revoke all on function helix_private.assign_property_reference() from public,anon,authenticated;
create trigger assign_property_reference before insert or update of reference on public.properties for each row execute function helix_private.assign_property_reference();

-- One genuinely new listing was already entered before the migration.
update public.properties set reference='HP1101-406',reference_aliases=array_append(reference_aliases,reference) where id='0e3c9529-52f4-4eb2-aca5-7116b5872878' and legacy_reference is null;
update public.profiles set next_property_seq=greatest(next_property_seq,407) where id='8f2d59dd-aedf-45ff-a8ef-04809208f1a0';
-- The supplied Idealista listing explicitly shows 4 bedrooms for this T4.
update public.properties set beds=4 where id='001256b4-08ea-4966-ab7e-e3b3fa442ec0' and beds=2 and typology='T4';

-- Cover real listings entered concurrently while this migration was prepared.
do $$
declare p record; next_ref text; sequence_number integer;
begin
 for p in select prop.id,prop.reference,a.id agent_id,a.code,ag.code agency_code,ag.reference_city_code city from public.properties prop join public.profiles a on a.id=prop.agent_id join public.agencies ag on ag.id=a.agency_id where ag.id='f515ccc5-0db4-4a3a-8f84-e2c674e68928' and a.code is not null and prop.legacy_reference is null and prop.reference !~ ('^HP'||ag.code||ag.reference_city_code||lpad(a.code::text,2,'0')||'-[0-9]{2,}$') order by prop.created_at,prop.id loop
  sequence_number=public.next_property_seq(p.agent_id);
  next_ref='HP'||p.agency_code||p.city||lpad(p.code::text,2,'0')||'-'||lpad(sequence_number::text,greatest(2,length(sequence_number::text)),'0');
  update public.properties set reference=next_ref where id=p.id;
  insert into public.property_audit(property_id,property_ref,actor_id,actor_name,actor_role,action,changes) values(p.id,next_ref,'8f2d59dd-aedf-45ff-a8ef-04809208f1a0','Rodrigo Silva','superadmin','editou',jsonb_build_array(jsonb_build_object('field','Referência','from',p.reference,'to',next_ref)));
 end loop;
end; $$;
