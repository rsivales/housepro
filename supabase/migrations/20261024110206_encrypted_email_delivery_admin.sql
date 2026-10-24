create table if not exists helix_private.email_delivery_config (
 id boolean primary key default true check(id),
 sender text not null default '',
 notify_email text not null default '',
 enabled boolean not null default false,
 secret_id uuid,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id)
);
alter table helix_private.email_delivery_config enable row level security;
revoke all on helix_private.email_delivery_config from public,anon,authenticated;

create or replace function public.get_email_delivery_config() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c helix_private.email_delivery_config%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 select * into c from helix_private.email_delivery_config where id=true;
 if not found then return null; end if;
 return jsonb_build_object('sender',c.sender,'notifyEmail',c.notify_email,'enabled',c.enabled,'keyConfigured',c.secret_id is not null,'updatedAt',c.updated_at);
end;$$;
create or replace function public.get_email_delivery_credentials() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c helix_private.email_delivery_config%rowtype; k text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 select * into c from helix_private.email_delivery_config where id=true;
 if not found then return null; end if;
 if c.enabled and c.secret_id is not null then select decrypted_secret into k from vault.decrypted_secrets where id=c.secret_id; end if;
 return jsonb_build_object('sender',c.sender,'notifyEmail',c.notify_email,'enabled',c.enabled,'apiKey',k);
end;$$;
create or replace function public.set_email_delivery_config(p_sender text,p_notify_email text,p_enabled boolean,p_actor uuid,p_api_key text default null) returns void
language plpgsql security definer set search_path='' as $$
declare k uuid;
begin
 if auth.role() is distinct from 'service_role' or not exists(select 1 from public.profiles where id=p_actor and active and role_key in ('admin','superadmin')) then raise exception 'forbidden'; end if;
 if p_sender !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$' or (coalesce(p_notify_email,'')<>'' and p_notify_email !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$') then raise exception 'Endereço de e-mail inválido.'; end if;
 insert into helix_private.email_delivery_config(id) values(true) on conflict do nothing;
 select secret_id into k from helix_private.email_delivery_config where id=true for update;
 if coalesce(p_api_key,'')<>'' then
  if left(p_api_key,3)<>'re_' or length(p_api_key)>2000 or p_api_key~'[[:space:]]' then raise exception 'Chave Resend inválida.'; end if;
  if k is null then k:=vault.create_secret(p_api_key,'helix_email_delivery','Helix transactional email'); else perform vault.update_secret(k,p_api_key); end if;
 end if;
 if p_enabled and k is null then raise exception 'Introduza a chave de envio antes de ativar.'; end if;
 update helix_private.email_delivery_config set sender=p_sender,notify_email=coalesce(p_notify_email,''),enabled=p_enabled,secret_id=k,updated_at=now(),updated_by=p_actor where id=true;
end;$$;
revoke all on function public.get_email_delivery_config() from public,anon,authenticated;
revoke all on function public.get_email_delivery_credentials() from public,anon,authenticated;
revoke all on function public.set_email_delivery_config(text,text,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.get_email_delivery_config() to service_role;
grant execute on function public.get_email_delivery_credentials() to service_role;
grant execute on function public.set_email_delivery_config(text,text,boolean,uuid,text) to service_role;
