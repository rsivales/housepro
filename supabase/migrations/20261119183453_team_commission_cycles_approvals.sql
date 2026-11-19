-- Prospective governance: no historic closure or payout is rewritten.
create table public.agent_commission_policies (
 agent_id uuid primary key references public.profiles(id) on delete restrict,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 joined_on date not null check(joined_on>='1900-01-01'),
 annual_revenue_goal numeric(16,2) not null default 60000 check(annual_revenue_goal between 1000 and 10000000),
 annual_listings_goal integer not null default 0 check(annual_listings_goal between 0 and 1000),
 version integer not null default 1,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now()
);
create table public.agency_management_requests (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete restrict,
 agent_id uuid references public.profiles(id) on delete restrict,
 kind text not null check(kind in ('regime','agent_policy')),
 payload jsonb not null,
 baseline_version integer not null check(baseline_version>=0),
 reason text not null check(length(btrim(reason)) between 10 and 2000),
 requested_by uuid not null references public.profiles(id),
 status text not null default 'pendente' check(status in ('pendente','aprovado','recusado')),
 decided_by uuid references public.profiles(id),
 decision_note text,
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 check((kind='regime' and agent_id is null) or (kind='agent_policy' and agent_id is not null))
);
create unique index management_request_pending on public.agency_management_requests(agency_id,kind,coalesce(agent_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status='pendente';
create index management_request_agency on public.agency_management_requests(agency_id,created_at desc);
create index management_request_agent on public.agency_management_requests(agent_id);
create index commission_policy_agency on public.agent_commission_policies(agency_id);
alter table public.agent_commission_policies enable row level security;
alter table public.agency_management_requests enable row level security;
revoke all on public.agent_commission_policies,public.agency_management_requests from public,anon,authenticated;
grant all on public.agent_commission_policies,public.agency_management_requests to service_role;

create function helix_private.commission_cycle_bounds(p_joined date,p_day date)
returns table(starts_on date,ends_on date) language plpgsql immutable set search_path='' as $$
declare y integer; s date;
begin
 y:=greatest(0,extract(year from p_day)::integer-extract(year from p_joined)::integer);
 s:=(p_joined+make_interval(years=>y))::date;
 if s>p_day and y>0 then y:=y-1; s:=(p_joined+make_interval(years=>y))::date; end if;
 return query select s,(p_joined+make_interval(years=>y+1))::date;
end;$$;
revoke all on function helix_private.commission_cycle_bounds(date,date) from public,anon,authenticated;

create function helix_private.agent_cycle_summary(p_agent uuid,p_at timestamptz default now())
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare p public.profiles%rowtype; policy public.agent_commission_policies%rowtype; joined date; s date; e date; prev date; turnover numeric; previous numeric; n integer; listing_count integer; recent integer;
begin
 select * into p from public.profiles where id=p_agent;
 if not found then raise exception 'agent_missing'; end if;
 select * into policy from public.agent_commission_policies where agent_id=p.id and agency_id=p.agency_id;
 joined:=coalesce(policy.joined_on,(p.created_at at time zone 'Europe/Lisbon')::date);
 select starts_on,ends_on into s,e from helix_private.commission_cycle_bounds(joined,(p_at at time zone 'Europe/Lisbon')::date);
 -- An anniversary's previous period is calculated from the original anchor (incl. leap years).
 select starts_on into prev from helix_private.commission_cycle_bounds(joined,s-1);
 select coalesce(sum((pr->>'commissionBase')::numeric) filter(where (c.closed_at at time zone 'Europe/Lisbon')::date>=s),0),
 count(*) filter(where (c.closed_at at time zone 'Europe/Lisbon')::date>=s),
 coalesce(sum((pr->>'commissionBase')::numeric) filter(where (c.closed_at at time zone 'Europe/Lisbon')::date>=prev and (c.closed_at at time zone 'Europe/Lisbon')::date<s),0)
 into turnover,n,previous
 from public.deal_financial_closures c cross join lateral jsonb_array_elements(c.snapshot->'financials'->'producers')pr
 where c.status='posted' and c.agency_id=p.agency_id and pr->>'id'=p.id::text
 and (c.closed_at at time zone 'Europe/Lisbon')::date<e and c.closed_at<=p_at;
 select count(*) filter(where coalesce(listed_at,(created_at at time zone 'Europe/Lisbon')::date)>=s),
 count(*) filter(where coalesce(listed_at,(created_at at time zone 'Europe/Lisbon')::date)>=(p_at at time zone 'Europe/Lisbon')::date-90)
 into listing_count,recent from public.properties where agent_id=p.id and approval='aprovado' and coalesce(listed_at,(created_at at time zone 'Europe/Lisbon')::date)<e and coalesce(listed_at,(created_at at time zone 'Europe/Lisbon')::date)<=(p_at at time zone 'Europe/Lisbon')::date;
 return jsonb_build_object('agentId',p.id,'name',p.name,'agencyId',p.agency_id,'joinedOn',joined,'dateConfirmed',policy.agent_id is not null,
 'cycleStart',s,'cycleEnd',e,'gross',turnover,'closedDeals',n,'listings',listing_count,'recentListings',recent,'previousGross',previous,
 'annualRevenueGoal',coalesce(policy.annual_revenue_goal,60000),'annualListingsGoal',coalesce(policy.annual_listings_goal,0),'policyVersion',coalesce(policy.version,0),
 'companyValidated',p.company_validated,'proProducer',p.pro_producer_since is not null and p.pro_producer_since<=p_at and exists(select 1 from public.pro_producer_requests r where r.agent_id=p.id and r.agency_id=p.agency_id and r.status='aprovado'));
end;$$;
revoke all on function helix_private.agent_cycle_summary(uuid,timestamptz) from public,anon,authenticated;
create function public.commission_cycle_summaries(p_agents uuid[]) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(helix_private.agent_cycle_summary(id)), '[]'::jsonb) from public.profiles where id=any(p_agents);
$$;
revoke all on function public.commission_cycle_summaries(uuid[]) from public,anon,authenticated;
grant usage on schema helix_private to service_role;
grant execute on function helix_private.commission_cycle_bounds(date,date),helix_private.agent_cycle_summary(uuid,timestamptz),public.commission_cycle_summaries(uuid[]) to service_role;

create function public.request_agency_management(p_agency uuid,p_agent uuid,p_kind text,p_payload jsonb,p_version integer,p_reason text,p_actor uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rid uuid; v integer;
begin
 if not exists(select 1 from public.profiles a left join public.agency_finance_settings s on s.agency_id=p_agency
 where a.id=p_actor and a.active and (a.role_key in ('admin','superadmin') or s.broker_id=a.id or (a.role_key='diretor' and a.agency_id=p_agency))) then raise exception 'forbidden'; end if;
 if p_kind='regime' then
  if p_agent is not null then raise exception 'invalid_request'; end if;
  select commission_version into v from public.agency_finance_settings where agency_id=p_agency;
  if v is distinct from p_version then raise exception 'stale_version'; end if;
  if p_payload->'ladder' is distinct from helix_private.commission_plan_v2()->'ladder' or p_payload->'agencyCapEnabled' is distinct from 'false'::jsonb
   or p_payload->>'royaltiesPct'<>'3' or p_payload->>'pensionPct'<>'2' or p_payload->>'brokerPensionPct'<>'2'
   or jsonb_typeof(p_payload->'overrideTiers') is distinct from 'array' or jsonb_array_length(p_payload->'overrideTiers')<>4
   or exists(select 1 from jsonb_array_elements_text(p_payload->'overrideTiers') x where x::numeric<0 or x::numeric>20)
   or (select sum(x::numeric) from jsonb_array_elements_text(p_payload->'overrideTiers') x)>20
   or jsonb_typeof(p_payload->'otherIncomeShares') is distinct from 'object' or (select count(*) from jsonb_object_keys(p_payload->'otherIncomeShares'))<>4
   or exists(select 1 from jsonb_each_text(p_payload->'otherIncomeShares') x where x.key not in ('credito','certificado','parceria','outros') or x.value::numeric not between 0 and 100)
   then raise exception 'invalid_plan'; end if;
 elsif p_kind='agent_policy' then
  if not exists(select 1 from public.profiles where id=p_agent and agency_id=p_agency and active) then raise exception 'invalid_agent'; end if;
  select coalesce((select version from public.agent_commission_policies where agent_id=p_agent),0) into v;
  if v is distinct from p_version then raise exception 'stale_version'; end if;
  if (p_payload->>'joinedOn')::date not between '1900-01-01'::date and (now() at time zone 'Europe/Lisbon')::date
    or (p_payload->>'annualRevenueGoal')::numeric not between 1000 and 10000000 or (p_payload->>'annualListingsGoal')::integer not between 0 and 1000
    or not (p_payload ?& array['joinedOn','annualRevenueGoal','annualListingsGoal']) then raise exception 'invalid_policy'; end if;
 else raise exception 'invalid_kind'; end if;
 insert into public.agency_management_requests(agency_id,agent_id,kind,payload,baseline_version,reason,requested_by)
 values(p_agency,p_agent,p_kind,p_payload,p_version,btrim(p_reason),p_actor) returning id into rid;
 insert into public.notifications(user_id,type,title,body,href)
 select id,'qualidade','Pedido de autorização · comissionamento',case when p_kind='regime' then 'Revisão de overrides e repartições da agência.' else 'Confirmar data de entrada e objetivos do agente.' end,'/app/aprovacoes-comissoes'
 from public.profiles where active and role_key in ('admin','superadmin');
 return rid;
end;$$;
revoke all on function public.request_agency_management(uuid,uuid,text,jsonb,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.request_agency_management(uuid,uuid,text,jsonb,integer,text,uuid) to service_role;

create function helix_private.require_regime_approval() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.commission_regime is distinct from old.commission_regime then
  if not exists(select 1 from public.agency_management_requests r where r.id=nullif(current_setting('helix.management_approval',true),'')::uuid
    and r.kind='regime' and r.agency_id=new.agency_id and r.status='aprovado' and r.decided_by=new.updated_by
    and r.baseline_version=old.commission_version and r.payload=new.commission_regime)
  then raise exception 'brand_approval_required'; end if;
 end if;
 return new;
end;$$;
revoke all on function helix_private.require_regime_approval() from public,anon,authenticated;
create trigger require_regime_approval before update on public.agency_finance_settings for each row execute function helix_private.require_regime_approval();

create function public.decide_agency_management(p_request uuid,p_approve boolean,p_note text,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.agency_management_requests%rowtype; v integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and active and role_key in ('admin','superadmin')) then raise exception 'forbidden'; end if;
 if length(btrim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'decision_note_required'; end if;
 select * into r from public.agency_management_requests where id=p_request for update;
 if not found or r.status<>'pendente' then raise exception 'request_not_pending'; end if;
 if p_approve then
  if r.kind='regime' then
   select commission_version into v from public.agency_finance_settings where agency_id=r.agency_id for update;
   if v is distinct from r.baseline_version then raise exception 'stale_version'; end if;
  else
   perform id from public.profiles where id=r.agent_id and agency_id=r.agency_id and active for update;
   if not found then raise exception 'agent_moved_or_inactive'; end if;
   select coalesce((select version from public.agent_commission_policies where agent_id=r.agent_id),0) into v;
   if v is distinct from r.baseline_version then raise exception 'stale_version'; end if;
  end if;
 end if;
 update public.agency_management_requests set status=case when p_approve then 'aprovado' else 'recusado' end,decided_by=p_actor,decision_note=btrim(p_note),decided_at=now() where id=r.id;
 if p_approve and r.kind='regime' then
  perform set_config('helix.management_approval',r.id::text,true);
  update public.agency_finance_settings set commission_regime=r.payload,commission_version=commission_version+1,updated_by=p_actor,updated_at=now() where agency_id=r.agency_id;
 elsif p_approve then
  insert into public.agent_commission_policies(agent_id,agency_id,joined_on,annual_revenue_goal,annual_listings_goal,version,updated_by)
  values(r.agent_id,r.agency_id,(r.payload->>'joinedOn')::date,(r.payload->>'annualRevenueGoal')::numeric,(r.payload->>'annualListingsGoal')::integer,r.baseline_version+1,p_actor)
  on conflict(agent_id) do update set agency_id=excluded.agency_id,joined_on=excluded.joined_on,annual_revenue_goal=excluded.annual_revenue_goal,annual_listings_goal=excluded.annual_listings_goal,version=excluded.version,updated_by=excluded.updated_by,updated_at=now();
 end if;
 insert into public.notifications(user_id,type,title,body,href)
 select distinct x,'qualidade',case when p_approve then 'Alteração autorizada pela Marca' else 'Pedido recusado pela Marca' end,btrim(p_note),'/app/broker/comissionamento?agency='||r.agency_id::text
 from unnest(array[r.requested_by,r.agent_id]) x where x is not null;
end;$$;
revoke all on function public.decide_agency_management(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.decide_agency_management(uuid,boolean,text,uuid) to service_role;

-- Daily, idempotent anniversary and performance reminders to agent + actual broker.
create table public.commission_cycle_alerts (
 agent_id uuid not null references public.profiles(id), cycle_start date not null, checkpoint integer not null, created_at timestamptz not null default now(), primary key(agent_id,cycle_start,checkpoint)
);
alter table public.commission_cycle_alerts enable row level security;
revoke all on public.commission_cycle_alerts from public,anon,authenticated;
grant all on public.commission_cycle_alerts to service_role;
create function helix_private.notify_commission_cycles() returns integer language plpgsql security definer set search_path='' as $$
declare p record; c jsonb; remaining integer; checkpoint integer; added integer; n integer:=0; goal numeric; danger boolean; message text;
begin
 for p in select pr.id,pr.name,pr.agency_id,s.broker_id from public.profiles pr left join public.agency_finance_settings s on s.agency_id=pr.agency_id
 where pr.active and pr.agency_id is not null and pr.role_key not in ('advogado','parceiro') and (pr.role_key<>'superadmin' or coalesce(trim(pr.public_title),'')<>'') loop
  c:=helix_private.agent_cycle_summary(p.id); remaining:=(c->>'cycleEnd')::date-(now() at time zone 'Europe/Lisbon')::date;
  checkpoint:=case when remaining<=7 then 7 when remaining<=30 then 30 when remaining<=60 then 60 when remaining<=90 then 90 else null end;
  if checkpoint is null then continue; end if;
  goal:=(c->>'annualRevenueGoal')::numeric;
  danger:=(c->>'gross')::numeric<goal or ((c->>'annualListingsGoal')::integer>0 and (c->>'listings')::integer<(c->>'annualListingsGoal')::integer);
  insert into public.commission_cycle_alerts(agent_id,cycle_start,checkpoint) values(p.id,(c->>'cycleStart')::date,checkpoint) on conflict do nothing;
  get diagnostics added=row_count; if added=0 then continue; end if;
  message:=p.name||' · Ciclo termina em '||remaining||' dias ('||(c->>'cycleEnd')||'). Faturação: '||(c->>'gross')||' € de '||goal||' €. Angariações: '||(c->>'listings')||case when (c->>'annualListingsGoal')::integer>0 then '/'||(c->>'annualListingsGoal') else ' (objetivo por definir)' end||'. '||
   case when (c->>'proProducer')::boolean then 'Pro Producer: qualquer revisão do regime carece de autorização da Marca.' else 'No aniversário começa um novo acumulado, no primeiro patamar. Os fechos anteriores mantêm as comissões.' end;
  insert into public.notifications(user_id,type,title,body,href)
  select distinct x,'qualidade',case when danger then 'Atenção aos objetivos · fim de ciclo' else 'Revisão anual de comissionamento' end,message,
   case when x=p.id then '/app/comissoes' else '/app/broker/comissionamento?agency='||p.agency_id::text end from unnest(array[p.id,p.broker_id])x where x is not null;
  n:=n+1;
 end loop;
 return n;
end;$$;
revoke all on function helix_private.notify_commission_cycles() from public,anon,authenticated;
grant execute on function helix_private.notify_commission_cycles() to service_role;
select cron.schedule('helix-commission-cycle-alerts','30 7 * * *',$job$select helix_private.notify_commission_cycles();$job$);

-- Fresh deals use the same anniversary ledger as broker monitoring.
create or replace function helix_private.post_deal_finances(p_deal uuid, p_closed_at timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 d public.deals%rowtype; prop public.properties%rowtype; prof public.profiles%rowtype;
 existing uuid; closure uuid; completed timestamptz; gross numeric; external_share numeric:=0; retained numeric;
 allocation jsonb; allocations jsonb; band jsonb; plan jsonb;
 producer uuid; pct numeric; base numeric; total_cents bigint; allocated_cents bigint:=0; base_cents bigint; allocation_count int; allocation_index int:=0;
 prior numeric; prior_agency numeric; remaining numeric; cursor_value numeric; band_size numeric; take_value numeric; agent_raw numeric; agent_gross numeric; agency_gross numeric;
 royalty_agent numeric; royalty_agency numeric; pension numeric; net numeric; sponsor uuid; sponsor_row public.profiles%rowtype; seen uuid[]; level_no int; override_amount numeric; override_total numeric; override_budget numeric;
 sum_ra numeric:=0; sum_rg numeric:=0; sum_p numeric:=0; sum_net numeric:=0; sum_agency_net numeric:=0;
 broker uuid; broker_name text; broker_pension numeric; broker_pension_sum numeric:=0; broker_base_sum numeric:=0;
 producers jsonb:='[]'::jsonb; overrides jsonb:='[]'::jsonb; p jsonb; o jsonb;
begin
 select * into d from public.deals where id=p_deal for update;
 if not found or d.stage::text<>'concluido' then raise exception 'finance_deal_not_completed'; end if;
 select id into existing from public.deal_financial_closures where deal_id=d.id and status='posted';
 if existing is not null then return existing; end if;
 if exists(select 1 from public.payouts where closure_id is null and (deal_id=d.id or deal_ref=d.id::text or deal_ref=(select reference from public.properties where id=d.property_id))) then
  raise exception 'Existem pagamentos antigos para este negócio. É necessária reconciliação antes de gerar novos valores.';
 end if;
 select s.broker_id,p.name into broker,broker_name from public.agency_finance_settings s join public.profiles p on p.id=s.broker_id and p.active where s.agency_id=d.agency_id;
 if broker is null then raise exception 'Defina o broker da agência na área de gestão antes de concluir o negócio.'; end if;
 select coalesce(s.commission_regime,helix_private.commission_plan_v2()) into plan from public.agency_finance_settings s where s.agency_id=d.agency_id;
 if plan is null then raise exception 'Regime de comissão da agência em falta.'; end if;
 plan:=plan||jsonb_build_object('ladder',helix_private.commission_plan_v2()->'ladder','agencyCapEnabled',false);
 select * into prop from public.properties where id=d.property_id;
 if not found then raise exception 'finance_property_missing'; end if;
 if d.amount is null or d.amount<=0 then raise exception 'Valor do negócio em falta.'; end if;
 if d.commission_type='fixed' then gross:=d.commission_fixed;
 elsif d.commission_pct is not null then gross:=d.amount*d.commission_pct/100;
 else raise exception 'Comissão do negócio por definir.'; end if;
 if gross is null or gross<0 then raise exception 'Comissão inválida.'; end if;
 if prop.operation::text='venda' and (coalesce(trim(prop.commission_justification),'')='' or gross<=0) then
  if d.amount<50000 then gross:=greatest(gross,4000); elsif d.amount<100000 then gross:=greatest(gross,5000); end if;
 end if;
 gross:=round(gross,2);
 if d.co_broker then
  if d.co_broker_split_type='fixed' then external_share:=d.co_broker_split_fixed;
  elsif d.co_broker_split_pct is not null then external_share:=round(gross*d.co_broker_split_pct/100,2);
  else raise exception 'Partilha externa por definir.'; end if;
  if external_share is null or external_share<0 or external_share>gross then raise exception 'Partilha externa inválida.'; end if;
 end if;
 retained:=gross-external_share;
 if jsonb_typeof(prop.commission_split)='array' and jsonb_array_length(prop.commission_split)>0 then allocations:=prop.commission_split;
 elsif d.angariador_id is not null and (d.consultor_comprador_id is null or d.consultor_comprador_id=d.angariador_id) then
  allocations:=jsonb_build_array(jsonb_build_object('agent_id',d.angariador_id,'pct',100));
 else raise exception 'A repartição interna dos consultores deve ser definida antes de concluir.'; end if;
 if (select sum((a->>'pct')::numeric) from jsonb_array_elements(allocations)a)<>100
  or exists(select 1 from jsonb_array_elements(allocations)a where coalesce((a->>'pct')::numeric,0)<=0 or coalesce((a->>'pct')::numeric,0)>100 or coalesce(a->>'agent_id',a->>'agentId','')='')
  or (select count(distinct coalesce(a->>'agent_id',a->>'agentId')) from jsonb_array_elements(allocations)a)<>jsonb_array_length(allocations) then raise exception 'A repartição interna deve totalizar 100%%, sem duplicar consultores.'; end if;
 -- Stable lock order serializes concurrent closures involving the same people.
 perform id from public.profiles where id in(select coalesce(a->>'agent_id',a->>'agentId')::uuid from jsonb_array_elements(allocations)a) order by id for update;
 allocation_count:=jsonb_array_length(allocations); total_cents:=round(retained*100);
 for allocation in
  select a.value||jsonb_build_object('_baseCents',floor(total_cents*(a.value->>'pct')::numeric/100)+
   case when row_number() over(order by total_cents*(a.value->>'pct')::numeric/100-floor(total_cents*(a.value->>'pct')::numeric/100) desc,a.ordinality)
    <= total_cents-sum(floor(total_cents*(a.value->>'pct')::numeric/100)) over() then 1 else 0 end)
  from jsonb_array_elements(allocations) with ordinality a(value,ordinality) order by a.ordinality loop
  allocation_index:=allocation_index+1; producer:=coalesce(allocation->>'agent_id',allocation->>'agentId')::uuid; pct:=(allocation->>'pct')::numeric;
  select * into prof from public.profiles where id=producer;
  if not found or prof.agency_id is distinct from d.agency_id then raise exception 'Consultor da repartição não pertence à agência do negócio.'; end if;
  -- Largest remainder allocation matches the application commission engine.
  base_cents:=(allocation->>'_baseCents')::bigint;
  allocated_cents:=allocated_cents+base_cents; base:=base_cents/100.0;
  prior:=(helix_private.agent_cycle_summary(producer,coalesce(p_closed_at,now()))->>'gross')::numeric;
  select coalesce(sum((pr->>'agencyGross')::numeric),0) into prior_agency
   from public.deal_financial_closures c cross join lateral jsonb_array_elements(c.snapshot->'financials'->'producers')pr
   where c.status='posted' and pr->>'id'=producer::text;
  remaining:=base; cursor_value:=prior; agent_raw:=0;
  for band in select value from jsonb_array_elements(plan->'ladder') loop
   exit when remaining<=0;
   band_size:=case when band->>'upTo' is null then remaining else greatest(0,(band->>'upTo')::numeric-cursor_value) end;
   take_value:=least(remaining,band_size);
   agent_raw:=agent_raw+take_value*(case when prof.company_validated then (band->>'withCompany')::numeric else (band->>'withoutCompany')::numeric end)/100;
   remaining:=remaining-take_value; cursor_value:=cursor_value+take_value;
  end loop;
  if prof.pro_producer_since is not null and exists(select 1 from public.pro_producer_requests r
   where r.agent_id=producer and r.agency_id=d.agency_id and r.status='aprovado' and r.decided_at<=coalesce(p_closed_at,now())) then agent_raw:=base*0.8; end if;
  agency_gross:=base-agent_raw;
  agency_gross:=round(agency_gross,2); agent_gross:=base-agency_gross;
  royalty_agent:=round(agent_gross*(plan->>'royaltiesPct')::numeric/100,2);
  royalty_agency:=round(base*(plan->>'royaltiesPct')::numeric/100,2)-royalty_agent;
  broker_pension:=round(agency_gross*(plan->>'brokerPensionPct')::numeric/100,2);
  broker_pension_sum:=broker_pension_sum+broker_pension; broker_base_sum:=broker_base_sum+agency_gross;
  pension:=round(agent_gross*(plan->>'pensionPct')::numeric/100,2); net:=agent_gross-royalty_agent-pension;
  override_budget:=least(round(base*(select sum(value::numeric) from jsonb_array_elements_text(plan->'overrideTiers'))/100,2),greatest(0,agency_gross-royalty_agency-broker_pension));
  override_total:=0; sponsor:=prof.sponsor_id; seen:=array[producer];
  for level_no in 1..jsonb_array_length(plan->'overrideTiers') loop
   exit when sponsor is null or sponsor=any(seen);
   select * into sponsor_row from public.profiles where id=sponsor;
   exit when not found;
   override_amount:=least(round(base*(plan->'overrideTiers'->>(level_no-1))::numeric/100,2),greatest(0,override_budget-override_total));
   if override_amount>0 then overrides:=overrides||jsonb_build_array(jsonb_build_object('id',sponsor,'name',sponsor_row.name,'source',producer,'amount',override_amount,'level',level_no)); end if;
   override_total:=override_total+override_amount; seen:=array_append(seen,sponsor); sponsor:=sponsor_row.sponsor_id;
  end loop;
  producers:=producers||jsonb_build_array(jsonb_build_object('id',producer,'name',prof.name,'allocationPct',pct,'commissionBase',base,'priorFaturacao',prior,'priorAgencyTake',prior_agency,'agentGross',agent_gross,'agencyGross',agency_gross,'royalties',royalty_agent,'royaltiesAgency',royalty_agency,'brokerPension',broker_pension,'pension',pension,'agentNet',net,'agentSplitPct',case when base>0 then agent_gross/base*100 else 0 end,'companyValidated',prof.company_validated,'cycleStart',helix_private.agent_cycle_summary(producer,coalesce(p_closed_at,now()))->'cycleStart','proProducer',prof.pro_producer_since is not null,'overrideTotal',override_total));
  sum_ra:=sum_ra+royalty_agent;sum_rg:=sum_rg+royalty_agency;sum_p:=sum_p+pension;sum_net:=sum_net+net;sum_agency_net:=sum_agency_net+agency_gross-royalty_agency-override_total-broker_pension;
 end loop;
 completed:=coalesce(p_closed_at,now());
 insert into public.deal_financial_closures(deal_id,agency_id,property_reference,closed_at,gross,external_share,retained,royalties_agent,royalties_agency,pension_total,producer_total,agency_net,broker_pension_total,snapshot)
 values(d.id,d.agency_id,prop.reference,completed,gross,external_share,retained,sum_ra,sum_rg,sum_p,sum_net,sum_agency_net,broker_pension_sum,
  jsonb_build_object('planVersion','housepro-commission-v5-anniversary','broker',jsonb_build_object('id',broker,'name',broker_name,'base',broker_base_sum,'pension',broker_pension_sum),'plan',plan,'financials',jsonb_build_object('status','ready','gross',gross,'externalShare',external_share,'retained',retained,'producers',producers),'overrides',overrides)) returning id into closure;
 for p in select value from jsonb_array_elements(producers) loop
  insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id)
  values(prop.reference,(p->>'id')::uuid,p->>'name','producao',(p->>'agentNet')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid),
        (prop.reference,(p->>'id')::uuid,p->>'name','pensao',(p->>'pension')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid);
  update public.profiles set monthly_gross=(helix_private.agent_cycle_summary((p->>'id')::uuid)->>'gross')::numeric where id=(p->>'id')::uuid;
  insert into public.notifications(user_id,type,title,body,amount,href) values((p->>'id')::uuid,'pensao','Contribuição de pensão registada',prop.reference||' · Dedução apurada no fecho do negócio.',(p->>'pension')::numeric,'/app/fundo-pensao');
 end loop;
 insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id,contribution_base)
 values(prop.reference,broker,broker_name,'pensao_broker',broker_pension_sum,'pendente',closure,d.id,d.agency_id,broker,broker_base_sum);
 insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id)
 values(prop.reference,null,'HousePro Brand','royalties',sum_ra+sum_rg,'pendente',closure,d.id,d.agency_id);
 for o in select value from jsonb_array_elements(overrides) loop
  insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id)
   values(prop.reference,(o->>'id')::uuid,o->>'name','override',(o->>'amount')::numeric,'pendente',closure,d.id,d.agency_id,(o->>'source')::uuid);
 end loop;
 insert into public.notifications(user_id,type,title,body,amount,href)
 select id,'royalties','Royalties registados · '||prop.reference,'Agência: '||coalesce((select name from public.agencies where id=d.agency_id),'—')||' · Negócio: '||prop.reference,sum_ra+sum_rg,'/admin/royalties'
 from public.profiles where active and role_key='superadmin' and coalesce(trim(public_title),'')='';
 return closure;
end;
$$;
revoke all on function helix_private.post_deal_finances(uuid,timestamptz) from public,anon,authenticated;
