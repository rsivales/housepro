create table public.owner_report_settings (
 property_id uuid primary key references public.properties(id) on delete cascade,
 agent_id uuid not null references public.profiles(id),
 settings jsonb not null,
 revision uuid not null default gen_random_uuid(),
 period_from timestamptz not null,
 next_at timestamptz not null,
 sequence integer not null default 0,
 updated_at timestamptz not null default now()
);
create table public.owner_report_outbox (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.properties(id) on delete cascade,
 agent_id uuid not null references public.profiles(id),
 revision uuid not null,
 period_start timestamptz not null,
 period_end timestamptz not null,
 kind text not null check (kind in ('owner','broker')),
 state text not null default 'pending' check (state in ('pending','accepted','failed','cancelled')),
 payload jsonb not null,
 attempts integer not null default 0,
 first_attempt_at timestamptz,
 last_attempt_at timestamptz,
 accepted_at timestamptz,
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 unique(property_id,period_end,kind)
);
alter table public.owner_report_settings enable row level security;
alter table public.owner_report_outbox enable row level security;
revoke all on public.owner_report_settings,public.owner_report_outbox from public,anon,authenticated;
grant all on public.owner_report_settings,public.owner_report_outbox to service_role;
create index owner_report_due_idx on public.owner_report_settings(next_at);
create index owner_report_pending_idx on public.owner_report_outbox(state,created_at);

create table helix_private.owner_report_worker (
 id boolean primary key default true check(id),
 secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
 lock_token uuid, lock_until timestamptz,
 last_run_at timestamptz
);
alter table helix_private.owner_report_worker enable row level security;
revoke all on helix_private.owner_report_worker from public,anon,authenticated;
insert into helix_private.owner_report_worker(id) values(true);
create function public.owner_report_worker_access(p_token uuid default null,p_release boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r helix_private.owner_report_worker;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'forbidden'; end if;
 if p_token is null then select * into r from helix_private.owner_report_worker where id; return jsonb_build_object('secret',r.secret); end if;
 if p_release then
  update helix_private.owner_report_worker set lock_until=null,lock_token=null,last_run_at=now() where id and lock_token=p_token;
  return jsonb_build_object('released',found);
 end if;
 update helix_private.owner_report_worker set lock_token=p_token,lock_until=now()+interval '3 minutes' where id and (lock_until is null or lock_until<now());
 return jsonb_build_object('claimed',found);
end;
$$;
revoke all on function public.owner_report_worker_access(uuid,boolean) from public,anon,authenticated;
grant execute on function public.owner_report_worker_access(uuid,boolean) to service_role;
-- The endpoint is authenticated by its own secret and sends only configured properties.
select cron.schedule('housepro-owner-reports','35 * * * *',$job$
 select net.http_post(url:='https://housepro.pt/api/cron/owner-reports',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
 body:='{}'::jsonb,timeout_milliseconds:=120000)
 from helix_private.owner_report_worker where id;
$job$);

create function public.queue_owner_report(
 p_property uuid,p_revision uuid,p_due timestamptz,p_until timestamptz,p_next timestamptz,
 p_owner jsonb,p_broker jsonb
) returns boolean language plpgsql set search_path='' as $$
declare r public.owner_report_settings;
begin
 select * into r from public.owner_report_settings where property_id=p_property for update;
 if not found or r.revision<>p_revision or r.next_at<>p_due or not (r.settings->>'enabled')::boolean then return false; end if;
 insert into public.owner_report_outbox(property_id,agent_id,revision,period_start,period_end,kind,payload)
 values(p_property,r.agent_id,r.revision,r.period_from,p_until,'owner',p_owner);
 if p_broker is not null then
  insert into public.owner_report_outbox(property_id,agent_id,revision,period_start,period_end,kind,payload)
  values(p_property,r.agent_id,r.revision,r.period_from,p_until,'broker',p_broker);
 end if;
 update public.owner_report_settings set period_from=p_until,next_at=p_next,sequence=sequence+1 where property_id=p_property;
 return true;
end;
$$;
revoke all on function public.queue_owner_report(uuid,uuid,timestamptz,timestamptz,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.queue_owner_report(uuid,uuid,timestamptz,timestamptz,timestamptz,jsonb,jsonb) to service_role;

create function public.save_owner_report_settings(
 p_property uuid,p_agent uuid,p_expected uuid,p_settings jsonb,p_from timestamptz,p_next timestamptz
) returns boolean language plpgsql set search_path='' as $$
declare r public.owner_report_settings; start_at timestamptz;
begin
 perform 1 from public.properties where id=p_property and agent_id=p_agent for update;
 if not found then return false; end if;
 select * into r from public.owner_report_settings where property_id=p_property for update;
 if r.revision is distinct from p_expected then return false; end if;
 start_at=coalesce(r.period_from,p_from);
 -- Preserve the period of cancelled pending messages when the consultant changes the configuration.
 select least(start_at,min(period_start)) into start_at from public.owner_report_outbox
 where property_id=p_property and state='pending' and kind='owner';
 update public.owner_report_outbox set state='cancelled' where property_id=p_property and state='pending';
 insert into public.owner_report_settings(property_id,agent_id,settings,period_from,next_at)
 values(p_property,p_agent,p_settings,start_at,p_next)
 on conflict(property_id) do update set
 agent_id=excluded.agent_id,settings=excluded.settings,revision=gen_random_uuid(),
 period_from=excluded.period_from,next_at=excluded.next_at,updated_at=now();
 return true;
end;
$$;
revoke all on function public.save_owner_report_settings(uuid,uuid,uuid,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.save_owner_report_settings(uuid,uuid,uuid,jsonb,timestamptz,timestamptz) to service_role;
