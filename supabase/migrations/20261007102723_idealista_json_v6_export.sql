-- Private integration state. No client, anonymous, or authenticated table access.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table public.idealista_export_config (
 id text primary key check (id = 'housepro'),
 agency_id uuid not null references public.agencies(id),
 customer_code text not null default '' check (customer_code = '' or customer_code ~ '^ilc[a-z0-9]{40}$'),
 property_ids uuid[] not null default '{}',
 overrides jsonb not null default '{}' check (jsonb_typeof(overrides) = 'object'),
 development_service boolean not null default false,
 enabled boolean not null default false,
 review_approved boolean not null default false,
 migration_confirmed boolean not null default false,
 sync_secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
 last_hash text,
 last_export_at timestamptz,
 last_attempt_at timestamptz,
 last_count integer not null default 0,
 last_error text,
 lock_token uuid,
 lock_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.idealista_export_config enable row level security;
revoke all on public.idealista_export_config from anon, authenticated;
grant select,insert,update,delete on public.idealista_export_config to service_role;
-- Seed only the existing HousePro account; nothing is transmitted or activated.
insert into public.idealista_export_config (id,agency_id)
 select 'housepro',id from public.agencies where slug='housepro';

create function public.claim_idealista_export(p_token uuid) returns boolean
 language plpgsql security invoker set search_path = '' as $$
begin
 update public.idealista_export_config
 set lock_token=p_token,lock_until=now()+interval '5 minutes',last_attempt_at=now()
 where id='housepro' and enabled=true
 and (lock_until is null or lock_until<now())
 and (last_attempt_at is null or last_attempt_at<=now()-interval '15 minutes');
 return found;
end;
$$;
revoke all on function public.claim_idealista_export(uuid) from public,anon,authenticated;
grant execute on function public.claim_idealista_export(uuid) to service_role;

-- Private authenticated scheduler. Disabled accounts cause no HTTP requests.
select cron.schedule('housepro-idealista-json-v6','*/15 * * * *',$job$
 select net.http_post(
  url:='https://housepro.pt/api/cron/idealista',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||sync_secret),
  body:='{}'::jsonb,
  timeout_milliseconds:=120000
 ) from public.idealista_export_config where id='housepro' and enabled=true;
$job$);
