-- Keep visit location and contact name across sessions.
alter table public.visits
 add column contact_name text,
 add column location text;

-- One Google authorization and selected calendar per Helix profile.
create table public.agent_google_calendar_connections (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 refresh_secret_id uuid not null,
 calendar_id text not null default 'primary',
 calendar_label text not null default 'Agenda principal',
 connected_at timestamptz not null default now()
);
alter table public.agent_google_calendar_connections enable row level security;
revoke all on public.agent_google_calendar_connections from anon, authenticated;
grant all on public.agent_google_calendar_connections to service_role;

-- Only the authenticated server (service_role) can call these RPCs. Vault
-- secrets never cross the browser or appear in ordinary table reads.
create function public.helix_set_google_calendar_connection(p_profile uuid, p_refresh text, p_calendar_id text, p_calendar_label text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_secret uuid; new_secret uuid;
begin
 if p_profile is null or length(coalesce(p_refresh,'')) < 20 or length(coalesce(p_calendar_id,'')) not between 1 and 255 then raise exception 'invalid_google_connection'; end if;
 if not exists(select 1 from public.profiles where id=p_profile and active) then raise exception 'invalid_profile'; end if;
 select refresh_secret_id into old_secret from public.agent_google_calendar_connections where profile_id=p_profile for update;
 if old_secret is null then
  new_secret:=vault.create_secret(p_refresh,'helix_google_calendar_'||p_profile::text,'Google Calendar refresh token');
 else
  perform vault.update_secret(old_secret,p_refresh);
  new_secret:=old_secret;
 end if;
 insert into public.agent_google_calendar_connections(profile_id,refresh_secret_id,calendar_id,calendar_label)
 values(p_profile,new_secret,p_calendar_id,coalesce(nullif(p_calendar_label,''),'Agenda principal'))
 on conflict(profile_id) do update set refresh_secret_id=excluded.refresh_secret_id, calendar_id=excluded.calendar_id, calendar_label=excluded.calendar_label,connected_at=now();
end;$$;
revoke all on function public.helix_set_google_calendar_connection(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.helix_set_google_calendar_connection(uuid,text,text,text) to service_role;

create function public.helix_get_google_calendar_refresh(p_profile uuid)
returns text language sql security definer set search_path = '' as $$
 select v.decrypted_secret from public.agent_google_calendar_connections c
 join vault.decrypted_secrets v on v.id=c.refresh_secret_id where c.profile_id=p_profile;
$$;
revoke all on function public.helix_get_google_calendar_refresh(uuid) from public,anon,authenticated;
grant execute on function public.helix_get_google_calendar_refresh(uuid) to service_role;

create function public.helix_disconnect_google_calendar(p_profile uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret_id uuid;
begin
 delete from public.agent_google_calendar_connections where profile_id=p_profile returning refresh_secret_id into v_secret_id;
 if v_secret_id is not null then delete from vault.secrets where id=v_secret_id; end if;
end;$$;
revoke all on function public.helix_disconnect_google_calendar(uuid) from public,anon,authenticated;
grant execute on function public.helix_disconnect_google_calendar(uuid) to service_role;
