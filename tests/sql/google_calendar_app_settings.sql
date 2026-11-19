begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare master uuid; ordinary uuid; result jsonb; blocked boolean:=false; secret_count integer;
begin
 select id into master from public.profiles where active and role_key='superadmin' limit 1;
 select id into ordinary from public.profiles where active and role_key not in ('admin','superadmin') limit 1;
 if master is null or ordinary is null then raise exception 'Missing role fixtures';end if;
 begin perform public.set_google_calendar_app_config('fixture.apps.googleusercontent.com','fixture-not-a-real-secret',ordinary);
 exception when others then if sqlerrm='forbidden' then blocked:=true;else raise;end if;end;
 assert blocked,'Non-master changed OAuth app configuration';
 perform public.set_google_calendar_app_config('fixture.apps.googleusercontent.com','fixture-not-a-real-secret',master);
 result:=public.get_google_calendar_app_credentials();
 assert result->>'id'='fixture.apps.googleusercontent.com' and result->>'secret'='fixture-not-a-real-secret','Encrypted app credential roundtrip failed';
 assert result->>'redirect'='https://housepro.pt/api/calendar/google/callback','Callback differs from registered production path';
 perform public.set_google_calendar_app_config('fixture.apps.googleusercontent.com',null,master);
 result:=public.get_google_calendar_app_credentials();
 assert result->>'secret'='fixture-not-a-real-secret','Blank input erased OAuth secret';
 assert not has_function_privilege('authenticated','public.get_google_calendar_app_credentials()','EXECUTE'),'OAuth credential reader exposed';
 assert not has_function_privilege('anon','public.set_google_calendar_app_config(text,text,uuid)','EXECUTE'),'OAuth credential writer exposed';
 assert not has_table_privilege('authenticated','helix_private.google_calendar_app_config','SELECT'),'OAuth config table exposed';
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 blocked:=false;begin perform public.get_google_calendar_app_credentials();exception when others then if sqlerrm='forbidden' then blocked:=true;else raise;end if;end;
 assert blocked,'Non-service credential read was accepted';
end $$;
rollback;
select 'OAuth app secret encryption, preserved secret, fixed callback, Brand authorization and private execution verified; rolled back.' as verified;
