create table public.owner_report_setup_grace (
 agent_id uuid primary key references public.profiles(id) on delete cascade,
 first_seen_at timestamptz not null default now()
);
alter table public.owner_report_setup_grace enable row level security;
revoke all on public.owner_report_setup_grace from public,anon,authenticated;
grant all on public.owner_report_setup_grace to service_role;

create table public.marketing_subscriptions (
 email text primary key,
 name text not null default '',
 offers boolean not null default false,
 news boolean not null default false,
 confirmed_at timestamptz,
 pending_name text,
 pending_offers boolean,
 pending_news boolean,
 pending_token_hash text unique,
 requested_at timestamptz,
 cancel_token_hash text unique,
 cancel_requested_at timestamptz,
 unsubscribed_at timestamptz,
 source text not null default 'relatorio'
);
alter table public.marketing_subscriptions enable row level security;
revoke all on public.marketing_subscriptions from public,anon,authenticated;
grant all on public.marketing_subscriptions to service_role;
create index marketing_subscriptions_active_idx on public.marketing_subscriptions(confirmed_at)
 where confirmed_at is not null and unsubscribed_at is null;

alter table public.owner_report_settings
 add column quarterly_next_at timestamptz,
 add column quarterly_period_from timestamptz,
 add column quarterly_sequence integer not null default 0;
create index owner_report_quarterly_due_idx on public.owner_report_settings(quarterly_next_at)
 where quarterly_next_at is not null;
alter table public.owner_report_outbox drop constraint owner_report_outbox_kind_check;
alter table public.owner_report_outbox add constraint owner_report_outbox_kind_check
 check (kind in ('owner','broker','owner_quarterly','broker_quarterly'));

create or replace function public.save_owner_report_settings(
 p_property uuid,p_agent uuid,p_expected uuid,p_settings jsonb,p_from timestamptz,p_next timestamptz
) returns boolean language plpgsql set search_path='' as $$
declare r public.owner_report_settings; start_at timestamptz; quarterly_start timestamptz; pending_quarterly timestamptz;
begin
 perform 1 from public.properties where id=p_property and agent_id=p_agent for update;
 if not found then return false; end if;
 select * into r from public.owner_report_settings where property_id=p_property for update;
 if r.revision is distinct from p_expected then return false; end if;
 start_at=coalesce(r.period_from,p_from);
 select least(start_at,min(period_start)) into start_at from public.owner_report_outbox
 where property_id=p_property and state='pending' and kind='owner';
 quarterly_start=coalesce(r.quarterly_period_from,greatest((select created_at from public.properties where id=p_property),now()-interval '3 months'));
 select min(period_start) into pending_quarterly from public.owner_report_outbox
 where property_id=p_property and state='pending' and kind='owner_quarterly';
 quarterly_start=least(quarterly_start,pending_quarterly);
 update public.owner_report_outbox set state='cancelled' where property_id=p_property and state='pending';
 insert into public.owner_report_settings(property_id,agent_id,settings,period_from,next_at,quarterly_next_at,quarterly_period_from)
 values(p_property,p_agent,p_settings,start_at,p_next,
  case when coalesce((p_settings->>'quarterly')::boolean,false) then case when pending_quarterly is not null then now()+interval '10 minutes' else coalesce(r.quarterly_next_at,now()+interval '3 months') end end,
  case when coalesce((p_settings->>'quarterly')::boolean,false) then quarterly_start end)
 on conflict(property_id) do update set
 agent_id=excluded.agent_id,settings=excluded.settings,revision=gen_random_uuid(),
 period_from=excluded.period_from,next_at=excluded.next_at,
 quarterly_next_at=excluded.quarterly_next_at,quarterly_period_from=excluded.quarterly_period_from,updated_at=now();
 return true;
end;
$$;

create function public.queue_owner_report_quarterly(
 p_property uuid,p_revision uuid,p_due timestamptz,p_until timestamptz,p_next timestamptz,
 p_owner jsonb,p_broker jsonb
) returns boolean language plpgsql set search_path='' as $$
declare r public.owner_report_settings;
begin
 select * into r from public.owner_report_settings where property_id=p_property for update;
 if not found or r.revision<>p_revision or r.quarterly_next_at<>p_due or
  not (r.settings->>'enabled')::boolean or not coalesce((r.settings->>'quarterly')::boolean,false) then return false; end if;
 insert into public.owner_report_outbox(property_id,agent_id,revision,period_start,period_end,kind,payload)
 values(p_property,r.agent_id,r.revision,r.quarterly_period_from,p_until,'owner_quarterly',p_owner);
 if p_broker is not null then
  insert into public.owner_report_outbox(property_id,agent_id,revision,period_start,period_end,kind,payload)
  values(p_property,r.agent_id,r.revision,r.quarterly_period_from,p_until,'broker_quarterly',p_broker);
 end if;
 update public.owner_report_settings set quarterly_period_from=p_until,quarterly_next_at=p_next,
  quarterly_sequence=quarterly_sequence+1 where property_id=p_property;
 return true;
end;
$$;
revoke all on function public.queue_owner_report_quarterly(uuid,uuid,timestamptz,timestamptz,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.queue_owner_report_quarterly(uuid,uuid,timestamptz,timestamptz,timestamptz,jsonb,jsonb) to service_role;
