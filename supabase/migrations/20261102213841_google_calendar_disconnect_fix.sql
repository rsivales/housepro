-- Qualify the Vault secret identifier to avoid a PL/pgSQL column collision.
create or replace function public.helix_disconnect_google_calendar(p_profile uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret_id uuid;
begin
 delete from public.agent_google_calendar_connections where profile_id=p_profile returning refresh_secret_id into v_secret_id;
 if v_secret_id is not null then delete from vault.secrets where id=v_secret_id; end if;
end;$$;
revoke all on function public.helix_disconnect_google_calendar(uuid) from public,anon,authenticated;
grant execute on function public.helix_disconnect_google_calendar(uuid) to service_role;
