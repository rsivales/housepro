-- Public property-search leads: atomic capture, agency routing and audit metrics.
alter table public.leads
  add column if not exists assigned_agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists agency_id uuid references public.agencies(id) on delete set null,
  add column if not exists zone text,
  add column if not exists budget text,
  add column if not exists consent jsonb,
  add column if not exists qualification text default 'novo',
  add column if not exists unassigned boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_assigned_agent_idx on public.leads(assigned_agent_id);
create index if not exists leads_agency_created_idx on public.leads(agency_id, created_at desc);
create index if not exists leads_sub_source_email_idx on public.leads(sub_source, lower(email));

create table if not exists public.lead_routing_state (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  last_agent_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_routing_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  agent_id uuid references public.profiles(id) on delete set null,
  broker_id uuid references public.profiles(id) on delete set null,
  zone text,
  reason text not null,
  routed_at timestamptz not null default now()
);
create index if not exists lead_routing_events_agency_idx on public.lead_routing_events(agency_id, routed_at desc);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  note text,
  from_val text,
  to_val text,
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_idx on public.lead_activities(lead_id, created_at desc);

alter table public.lead_routing_state enable row level security;
alter table public.lead_routing_events enable row level security;
alter table public.lead_activities enable row level security;

create or replace function public.capture_property_lead(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := case when payload->>'kind' = 'personalized' then 'personalized' else 'alert' end;
  v_email text := lower(trim(payload->>'email'));
  v_name text := trim(coalesce(payload->>'name', ''));
  v_phone text := trim(coalesce(payload->>'phone', ''));
  v_zone text := trim(coalesce(payload#>>'{criteria,zone}', payload#>>'{criteria,location}', ''));
  v_sub_source text := case when v_kind = 'personalized' then 'Imóveis — Pesquisa personalizada' else 'Imóveis — Alerta de pesquisa' end;
  v_agency uuid;
  v_agent uuid;
  v_broker uuid;
  v_last uuid;
  v_lead uuid;
  v_message text;
  v_updated boolean := false;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce((payload->>'consent')::boolean, false) is not true
     or (v_kind = 'personalized' and v_name = '') then
    raise exception 'invalid_fields' using errcode = '22023';
  end if;

  -- Prefer an agency whose configured region matches the requested municipality.
  select a.id into v_agency
  from agencies a
  where exists (select 1 from profiles p where p.agency_id=a.id and p.active=true and p.role_key in ('agente','agente_ami'))
    and v_zone <> ''
    and (lower(a.region)=lower(v_zone) or lower(a.region) like '%'||lower(v_zone)||'%' or lower(v_zone) like '%'||lower(a.region)||'%')
  order by a.created_at, a.id limit 1;

  -- Never discard the lead: if no municipality is configured, use the oldest active agency pool.
  if v_agency is null then
    select a.id into v_agency from agencies a
    where exists (select 1 from profiles p where p.agency_id=a.id and p.active=true and p.role_key in ('agente','agente_ami'))
    order by a.created_at, a.id limit 1;
  end if;

  if v_agency is not null then
    insert into lead_routing_state(agency_id) values (v_agency) on conflict do nothing;
    select last_agent_id into v_last from lead_routing_state where agency_id=v_agency for update;
    select p.id into v_agent from profiles p
    where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami')
      and (v_last is null or (p.created_at,p.id) > (select q.created_at,q.id from profiles q where q.id=v_last))
    order by p.created_at,p.id limit 1;
    if v_agent is null then
      select p.id into v_agent from profiles p where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami') order by p.created_at,p.id limit 1;
    end if;
    update lead_routing_state set last_agent_id=v_agent,updated_at=now() where agency_id=v_agency;
    select p.id into v_broker from profiles p where p.agency_id=v_agency and p.active=true and p.role_key in ('diretor','admin') order by p.created_at limit 1;
  end if;

  v_message := jsonb_build_object(
    'criteria',coalesce(payload->'criteria','{}'::jsonb),
    'details',coalesce(payload->>'details',''),
    'contactPreference',coalesce(payload->>'contactPreference',''),
    'operationalConsent',true
  )::text;

  select id into v_lead from leads where lower(email)=v_email and sub_source=v_sub_source and status <> 'perdido' order by created_at desc limit 1;
  if v_lead is null then
    insert into leads(owner_id,assigned_agent_id,agency_id,name,contact,email,message,source,status,intent,sub_source,page_url,referrer_url,utm,marketing_consent,zone,budget,consent,unassigned)
    values(v_agent,v_agent,v_agency,case when v_kind='personalized' then v_name else 'Alerta de pesquisa' end,coalesce(nullif(v_phone,''),v_email),v_email,v_message,'site','novo','mensagem',v_sub_source,left(coalesce(payload->>'pageUrl',''),500),left(coalesce(payload->>'referrerUrl',''),500),coalesce(payload->'utm','{}'::jsonb),coalesce((payload->>'marketingConsent')::boolean,false),nullif(v_zone,''),payload#>>'{criteria,budget}',jsonb_build_object('base',true,'at',now()),v_agent is null)
    returning id into v_lead;
  else
    update leads set owner_id=v_agent,assigned_agent_id=v_agent,agency_id=v_agency,name=case when v_kind='personalized' then v_name else name end,contact=coalesce(nullif(v_phone,''),v_email),message=v_message,page_url=left(coalesce(payload->>'pageUrl',''),500),referrer_url=left(coalesce(payload->>'referrerUrl',''),500),utm=coalesce(payload->'utm','{}'::jsonb),marketing_consent=coalesce((payload->>'marketingConsent')::boolean,false),zone=nullif(v_zone,''),budget=payload#>>'{criteria,budget}',updated_at=now(),unassigned=v_agent is null where id=v_lead;
    v_updated := true;
  end if;

  insert into lead_routing_events(lead_id,agency_id,agent_id,broker_id,zone,reason)
  values(v_lead,v_agency,v_agent,v_broker,nullif(v_zone,''),case when v_agent is null then 'Sem consultor elegível; aguarda broker' else 'Zona + round-robin de consultores ativos' end);
  insert into lead_activities(lead_id,type,note,to_val) values(v_lead,'assigned','Distribuição automática do website',v_agent::text);
  return jsonb_build_object('ok',true,'id',v_lead,'updated',v_updated,'assigned',v_agent is not null);
end $$;

revoke all on function public.capture_property_lead(jsonb) from public;
grant execute on function public.capture_property_lead(jsonb) to anon, authenticated;

create or replace function public.cancel_property_alert(alert_id uuid, alert_email text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update leads set status='perdido',updated_at=now(),message=jsonb_build_object('alertCancelled',true,'cancelledAt',now())::text
  where id=alert_id and lower(email)=lower(trim(alert_email)) and sub_source='Imóveis — Alerta de pesquisa';
  return found;
end $$;
revoke all on function public.cancel_property_alert(uuid,text) from public;
grant execute on function public.cancel_property_alert(uuid,text) to anon,authenticated;

create or replace function public.lead_routing_dashboard(days_back integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_role text; v_agency uuid; v_result jsonb;
begin
  select role_key,agency_id into v_role,v_agency from profiles where id=auth.uid() and active=true;
  if v_role not in ('diretor','admin','superadmin') then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object(
    'total',count(*),
    'assigned',count(*) filter(where l.assigned_agent_id is not null),
    'awaiting',count(*) filter(where l.assigned_agent_id is null),
    'avgResponseMinutes',coalesce(round(avg(extract(epoch from (l.contacted_at-l.created_at))/60) filter(where l.contacted_at is not null)),0),
    'destinations',coalesce(jsonb_agg(jsonb_build_object('leadId',l.id,'createdAt',l.created_at,'subSource',l.sub_source,'zone',l.zone,'agency',a.name,'agent',p.name,'respondedAt',l.contacted_at,'responseMinutes',case when l.contacted_at is null then null else round(extract(epoch from (l.contacted_at-l.created_at))/60) end) order by l.created_at desc),'[]'::jsonb)
  ) into v_result
  from leads l left join agencies a on a.id=l.agency_id left join profiles p on p.id=l.assigned_agent_id
  where l.created_at >= now()-(greatest(1,least(days_back,365))||' days')::interval
    and l.sub_source in ('Imóveis — Pesquisa personalizada','Imóveis — Alerta de pesquisa')
    and (v_role='superadmin' or l.agency_id=v_agency);
  return v_result;
end $$;
revoke all on function public.lead_routing_dashboard(integer) from public;
grant execute on function public.lead_routing_dashboard(integer) to authenticated;
