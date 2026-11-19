-- Additive inbox and prospective financial management. Posted closures remain untouched.
alter table public.notifications add column dismissed_at timestamptz;
create index notifications_inbox_idx on public.notifications(user_id,created_at desc) where dismissed_at is null;

create table public.pro_producer_requests (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id),
 agent_id uuid not null references public.profiles(id),
 requested_by uuid not null references public.profiles(id),
 status text not null default 'pendente' check(status in ('pendente','aprovado','recusado')),
 decided_by uuid references public.profiles(id),
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 check ((status='pendente' and decided_by is null and decided_at is null) or (status<>'pendente' and decided_by is not null and decided_at is not null))
);
create unique index pro_producer_open_idx on public.pro_producer_requests(agent_id) where status in ('pendente','aprovado');
create index pro_producer_agency_idx on public.pro_producer_requests(agency_id,created_at desc);
alter table public.profiles add column pro_producer_since timestamptz;

create table public.helix_fee_plans (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id),
 agent_id uuid references public.profiles(id),
 amount numeric(12,2) not null check(amount>0 and amount<=100000),
 starts_on date not null check(extract(day from starts_on)=1),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 stopped_at timestamptz
);
create unique index helix_tech_fee_agency_idx on public.helix_fee_plans(agency_id) where agent_id is null and stopped_at is null;
create unique index helix_tech_fee_agent_idx on public.helix_fee_plans(agent_id) where agent_id is not null and stopped_at is null;

create table public.helix_fee_charges (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id),
 agent_id uuid references public.profiles(id),
 creditor text not null check(creditor in ('agencia','marca')),
 kind text not null check(kind in ('pro_producer','tecnologia')),
 source_id uuid not null,
 month date not null check(extract(day from month)=1),
 amount numeric(12,2) not null check(amount>0),
 status text not null default 'pendente' check(status in ('pendente','pago')),
 paid_at timestamptz,
 paid_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(kind,source_id,month),
 check((status='pendente' and paid_at is null and paid_by is null) or (status='pago' and paid_at is not null and paid_by is not null))
);
create index helix_fee_charges_agency_idx on public.helix_fee_charges(agency_id,month desc);
create unique index helix_fee_charges_agent_month_idx on public.helix_fee_charges(agent_id,kind,month) where agent_id is not null;
create unique index helix_fee_charges_agency_month_idx on public.helix_fee_charges(agency_id,kind,month) where agent_id is null;
create index helix_fee_charges_agent_idx on public.helix_fee_charges(agent_id,month desc);

alter table public.pro_producer_requests enable row level security;
alter table public.helix_fee_plans enable row level security;
alter table public.helix_fee_charges enable row level security;
revoke all on public.pro_producer_requests,public.helix_fee_plans,public.helix_fee_charges from public,anon,authenticated;
grant select,insert,update on public.pro_producer_requests,public.helix_fee_plans,public.helix_fee_charges to service_role;
-- Only server-side, approved workflow may set financial status. Profile self-edit must not grant it.
do $$
declare cols text;
begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns
 where table_schema='public' and table_name='profiles' and column_name<>'pro_producer_since'
 and column_name in (select column_name from information_schema.column_privileges where table_schema='public' and table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE');
 revoke update on public.profiles from authenticated;
 if cols is not null then execute 'grant update('||cols||') on public.profiles to authenticated'; end if;
end;$$;

-- Transactional approval: concurrent decisions cannot both be applied.
create or replace function public.decide_pro_producer(p_id uuid,p_actor uuid,p_approve boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.pro_producer_requests%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and active=true and role_key::text in ('admin','superadmin')) then raise exception 'forbidden'; end if;
 select * into r from public.pro_producer_requests where id=p_id for update;
 if not found or r.status<>'pendente' then raise exception 'request_unavailable'; end if;
 perform 1 from public.profiles where id=r.agent_id and agency_id=r.agency_id and active=true for update;
 if not found then raise exception 'agent_agency_changed'; end if;
 update public.pro_producer_requests set status=case when p_approve then 'aprovado' else 'recusado' end,decided_by=p_actor,decided_at=now() where id=p_id;
 if p_approve then
  update public.profiles set pro_producer_since=now() where id=r.agent_id;
 end if;
 insert into public.notifications(user_id,type,title,body,href)
 values(r.requested_by,'info',case when p_approve then 'Pro Producer aprovado' else 'Pro Producer recusado' end,
 'A Marca decidiu a proposta. Consulte os detalhes e condições.','/app/fees');
 insert into public.notifications(user_id,type,title,body,href)
 values(r.agent_id,'info',case when p_approve then 'Regime Pro Producer aprovado' else 'Proposta Pro Producer não aprovada' end,
 case when p_approve then 'Comissão de 80%, antes das deduções da Marca e pensão. Fee mensal de 300 € à agência, desde o mês da aprovação.' else 'Contacte a gestão da sua agência para mais informações.' end,'/app/fees');
end;$$;
revoke all on function public.decide_pro_producer(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.decide_pro_producer(uuid,uuid,boolean) to service_role;

-- Monthly accounting entries, not bank debits. Run daily to catch approvals and new plans.
create or replace function public.generate_helix_fees() returns integer
language plpgsql security invoker set search_path='' as $$
declare n int; m date:=date_trunc('month',now() at time zone 'Europe/Lisbon')::date;
begin
 insert into public.helix_fee_charges(agency_id,agent_id,creditor,kind,source_id,month,amount)
 select r.agency_id,r.agent_id,'agencia','pro_producer',r.id,m,300
 from public.pro_producer_requests r join public.profiles p on p.id=r.agent_id join public.agencies ag on ag.id=r.agency_id
 where r.status='aprovado' and not coalesce(ag.suspended,false) and p.active=true and p.agency_id=r.agency_id and p.pro_producer_since is not null
 and r.decided_at is not null and date_trunc('month',r.decided_at at time zone 'Europe/Lisbon')::date<=m
 on conflict do nothing;
 insert into public.helix_fee_charges(agency_id,agent_id,creditor,kind,source_id,month,amount)
 select f.agency_id,f.agent_id,'marca','tecnologia',f.id,m,f.amount
 from public.helix_fee_plans f join public.agencies a on a.id=f.agency_id
 left join public.profiles p on p.id=f.agent_id
 where f.stopped_at is null and f.starts_on<=m and not coalesce(a.suspended,false)
 and (f.agent_id is null or (p.active=true and p.agency_id=f.agency_id))
 on conflict do nothing;
 get diagnostics n=row_count;
 return n;
end;$$;
revoke all on function public.generate_helix_fees() from public,anon,authenticated;
grant execute on function public.generate_helix_fees() to service_role;

-- New prospective canonical plan. Null upper bound is unbounded turnover, not an editable commission.
create or replace function helix_private.commission_plan_v2() returns jsonb
language sql immutable set search_path='' as $$
 select '{"royaltiesPct":3,"pensionPct":2,"brokerPensionPct":2,"overrideTiers":[5,3,1,1],"ladder":[{"upTo":10000,"withCompany":50,"withoutCompany":40},{"upTo":60000,"withCompany":60,"withoutCompany":50},{"upTo":null,"withCompany":80,"withoutCompany":70}],"agencyCap":30000,"agencyCapEnabled":false}'::jsonb;
$$;
revoke all on function helix_private.commission_plan_v2() from public,anon,authenticated;

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
  prior:=greatest(coalesce(prof.monthly_gross,0),0);
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
   where r.agent_id=producer and r.agency_id=d.agency_id and r.status='aprovado') then agent_raw:=base*0.8; end if;
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
  producers:=producers||jsonb_build_array(jsonb_build_object('id',producer,'name',prof.name,'allocationPct',pct,'commissionBase',base,'priorFaturacao',prior,'priorAgencyTake',prior_agency,'agentGross',agent_gross,'agencyGross',agency_gross,'royalties',royalty_agent,'royaltiesAgency',royalty_agency,'brokerPension',broker_pension,'pension',pension,'agentNet',net,'agentSplitPct',case when base>0 then agent_gross/base*100 else 0 end,'companyValidated',prof.company_validated,'proProducer',prof.pro_producer_since is not null,'overrideTotal',override_total));
  sum_ra:=sum_ra+royalty_agent;sum_rg:=sum_rg+royalty_agency;sum_p:=sum_p+pension;sum_net:=sum_net+net;sum_agency_net:=sum_agency_net+agency_gross-royalty_agency-override_total-broker_pension;
 end loop;
 completed:=coalesce(p_closed_at,now());
 insert into public.deal_financial_closures(deal_id,agency_id,property_reference,closed_at,gross,external_share,retained,royalties_agent,royalties_agency,pension_total,producer_total,agency_net,broker_pension_total,snapshot)
 values(d.id,d.agency_id,prop.reference,completed,gross,external_share,retained,sum_ra,sum_rg,sum_p,sum_net,sum_agency_net,broker_pension_sum,
  jsonb_build_object('planVersion','housepro-commission-v4','broker',jsonb_build_object('id',broker,'name',broker_name,'base',broker_base_sum,'pension',broker_pension_sum),'plan',plan,'financials',jsonb_build_object('status','ready','gross',gross,'externalShare',external_share,'retained',retained,'producers',producers),'overrides',overrides)) returning id into closure;
 for p in select value from jsonb_array_elements(producers) loop
  insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id)
  values(prop.reference,(p->>'id')::uuid,p->>'name','producao',(p->>'agentNet')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid),
        (prop.reference,(p->>'id')::uuid,p->>'name','pensao',(p->>'pension')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid);
  update public.profiles set monthly_gross=coalesce(monthly_gross,0)+(p->>'commissionBase')::numeric where id=(p->>'id')::uuid;
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


create or replace function public.request_pro_producer(p_agency uuid,p_agent uuid,p_actor uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; agent_name text;
begin
 if not exists(
 select 1 from public.profiles actor
 left join public.agency_finance_settings s on s.agency_id=p_agency
 where actor.id=p_actor and actor.active=true and
 (actor.role_key::text in ('admin','superadmin') or s.broker_id=actor.id or (actor.role_key::text='diretor' and actor.agency_id=p_agency))
 ) then raise exception 'forbidden'; end if;
 select name into agent_name from public.profiles where id=p_agent and agency_id=p_agency and active=true for update;
 if not found then raise exception 'agent_unavailable'; end if;
 insert into public.pro_producer_requests(agency_id,agent_id,requested_by) values(p_agency,p_agent,p_actor) returning id into rid;
 insert into public.notifications(user_id,type,title,body,href)
 select id,'info','Pedido Pro Producer',agent_name||' · Pedido para 80% e fee de 300 €/mês.','/app/fees'
 from public.profiles where active=true and role_key::text in ('admin','superadmin');
 return rid;
end;$$;
revoke all on function public.request_pro_producer(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.request_pro_producer(uuid,uuid,uuid) to service_role;

select cron.schedule('helix-monthly-fees','15 3 * * *','select public.generate_helix_fees();');
