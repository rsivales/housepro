-- Historical consultants 03–12 are reserved, without creating fictional users.
-- Alvacir is the existing historical consultant (08); numbers ending in 13 are forbidden.
update public.profiles set code=8 where id='f5df4c3e-0c29-4fea-9da8-766d5b362a68' and agency_id='f515ccc5-0db4-4a3a-8f84-e2c674e68928';
update public.agencies set next_agent_code=greatest(next_agent_code,14) where id='f515ccc5-0db4-4a3a-8f84-e2c674e68928';
alter table public.profiles add constraint housepro_consultant_code_allowed check(code is null or (code>0 and code%100<>13));
alter table public.agencies add constraint housepro_agency_code_allowed check(code is null or (code>0 and code%100<>13));

create or replace function public.next_agent_code(p_agency uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare a public.agencies; n integer; high integer;
begin
 select * into a from public.agencies where id=p_agency for update;
 if not found then raise exception 'agency_not_found'; end if;
 select coalesce(max(code),0) into high from public.profiles where agency_id=p_agency;
 n=greatest(a.next_agent_code,high+1,1);
 if n%100=13 then n=n+1; end if;
 update public.agencies set next_agent_code=case when (n+1)%100=13 then n+2 else n+1 end where id=p_agency;
 return n;
end; $$;
revoke all on function public.next_agent_code(uuid) from public,anon,authenticated;
grant execute on function public.next_agent_code(uuid) to service_role;

-- Keep any genuine listings already assigned to Alvacir attached to their UUID.
update public.properties set reference=regexp_replace(reference,'^HP1103-','HP1108-') where agent_id='f5df4c3e-0c29-4fea-9da8-766d5b362a68' and legacy_reference is null and reference ~ '^HP1103-[0-9]{2,}$';

-- Consultant numbers have a minimum of two digits, never a truncating limit.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.next_property_seq(uuid)'::regprocedure) into definition;
 definition=replace(definition,'a.code not between 1 and 99','(a.code<1 or a.code%100=13)');
 definition=replace(definition,'lpad(a.code::text,2,''0'')','lpad(a.code::text,greatest(2,length(a.code::text)),''0'')');
 execute definition;
 select pg_get_functiondef('helix_private.assign_property_reference()'::regprocedure) into definition;
 definition=replace(definition,'a.code not between 1 and 99','(a.code<1 or a.code%100=13)');
 definition=replace(definition,'lpad(a.code::text,2,''0'')','lpad(a.code::text,greatest(2,length(a.code::text)),''0'')');
 execute definition;
end; $$;
