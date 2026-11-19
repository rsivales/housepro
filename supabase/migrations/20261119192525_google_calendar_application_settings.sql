-- Global OAuth application credentials. Individual agent refresh tokens remain separate.
create table helix_private.google_calendar_app_config (
 id boolean primary key default true check(id),
 client_id text not null,
 secret_id uuid not null,
 redirect_uri text not null default 'https://housepro.pt/api/calendar/google/callback' check(redirect_uri='https://housepro.pt/api/calendar/google/callback'),
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now()
);
alter table helix_private.google_calendar_app_config enable row level security;
revoke all on helix_private.google_calendar_app_config from public,anon,authenticated;
create function public.get_google_calendar_app_credentials() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c helix_private.google_calendar_app_config%rowtype; k text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 select * into c from helix_private.google_calendar_app_config where id=true;
 if not found then return null; end if;
 select decrypted_secret into k from vault.decrypted_secrets where id=c.secret_id;
 return jsonb_build_object('id',c.client_id,'secret',k,'redirect',c.redirect_uri,'updatedAt',c.updated_at);
end;$$;
create function public.set_google_calendar_app_config(p_client_id text,p_secret text,p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
declare k uuid;
begin
 if auth.role() is distinct from 'service_role' or not exists(select 1 from public.profiles where id=p_actor and active and role_key in ('admin','superadmin')) then raise exception 'forbidden'; end if;
 if p_client_id is null or p_client_id !~ '^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$' or length(p_client_id)>500 then raise exception 'invalid_client'; end if;
 select secret_id into k from helix_private.google_calendar_app_config where id=true for update;
 if coalesce(p_secret,'')<>'' then
  if length(p_secret)<8 or length(p_secret)>2000 or p_secret~'[[:space:]]' then raise exception 'invalid_secret'; end if;
  if k is null then k:=vault.create_secret(p_secret,'helix_google_calendar_app','Helix Google Calendar OAuth app');else perform vault.update_secret(k,p_secret);end if;
 end if;
 if k is null then raise exception 'missing_secret';end if;
 insert into helix_private.google_calendar_app_config(id,client_id,secret_id,updated_by)
 values(true,p_client_id,k,p_actor)
 on conflict(id) do update set client_id=excluded.client_id,secret_id=excluded.secret_id,updated_by=excluded.updated_by,updated_at=now();
end;$$;
revoke all on function public.get_google_calendar_app_credentials(),public.set_google_calendar_app_config(text,text,uuid) from public,anon,authenticated;
grant execute on function public.get_google_calendar_app_credentials(),public.set_google_calendar_app_config(text,text,uuid) to service_role;
