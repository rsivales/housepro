-- Additional broker mandate, independent of the person's primary login role.
create table public.agency_finance_settings (
 agency_id uuid primary key references public.agencies(id) on delete restrict,
 broker_id uuid not null references public.profiles(id) on delete restrict,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id)
);
alter table public.agency_finance_settings enable row level security;
revoke all on public.agency_finance_settings from anon,authenticated;
grant all on public.agency_finance_settings to service_role;
create index agency_finance_broker_idx on public.agency_finance_settings(broker_id);
-- The user identified Rodrigo as both agent and broker. Keep his primary role.
insert into public.agency_finance_settings(agency_id,broker_id,updated_by)
select a.id,p.id,p.id from public.agencies a join public.profiles p on p.agency_id=a.id
where a.slug='housepro' and p.email='rsilva.housepro@gmail.com' and p.active
on conflict(agency_id) do nothing;

alter table public.deal_financial_closures add column broker_pension_total numeric(16,2) not null default 0;
alter table public.payouts add column contribution_base numeric(16,2);
create table public.agency_financial_adjustments (
 id uuid primary key default gen_random_uuid(),
 closure_id uuid not null unique references public.deal_financial_closures(id) on delete restrict,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 broker_id uuid not null references public.profiles(id) on delete restrict,
 contribution_base numeric(16,2) not null,
 rate numeric not null,
 amount numeric(16,2) not null,
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.agency_financial_adjustments enable row level security;
revoke all on public.agency_financial_adjustments from anon,authenticated;
grant all on public.agency_financial_adjustments to service_role;
create index agency_adjustments_agency_idx on public.agency_financial_adjustments(agency_id);

create table public.agency_cash_entries (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete restrict,
 kind text not null check(kind in('income','expense')),
 entry_date date not null,
 category text not null,
 description text not null,
 amount numeric(16,2) not null check(amount>0),
 deal_id uuid references public.deals(id) on delete restrict,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 voided_at timestamptz,
 voided_by uuid references public.profiles(id)
);
alter table public.agency_cash_entries enable row level security;
revoke all on public.agency_cash_entries from anon,authenticated;
grant all on public.agency_cash_entries to service_role;
create index agency_cash_date_idx on public.agency_cash_entries(agency_id,entry_date desc);

create or replace function helix_private.commission_plan_v2() returns jsonb language sql immutable set search_path='' as $$
 select '{"royaltiesPct":3,"pensionPct":2,"brokerPensionPct":2,"agencyCap":30000,"overrideTiers":[5,3,1,1],"ladder":[{"upTo":10000,"withCompany":50,"withoutCompany":40},{"upTo":60000,"withCompany":60,"withoutCompany":50},{"upTo":null,"withCompany":90,"withoutCompany":80}]}'::jsonb;
$$;
revoke all on function helix_private.commission_plan_v2() from public,anon,authenticated;

create or replace function helix_private.post_deal_finances(p_deal uuid, p_closed_at timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 d public.deals%rowtype; prop public.properties%rowtype; prof public.profiles%rowtype;
 existing uuid; closure uuid; completed timestamptz; gross numeric; external_share numeric:=0; retained numeric;
 allocation jsonb; allocations jsonb; band jsonb; plan jsonb:=helix_private.commission_plan_v2();
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
  agency_gross:=least(base-agent_raw,greatest(0,(plan->>'agencyCap')::numeric-prior_agency));
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
  producers:=producers||jsonb_build_array(jsonb_build_object('id',producer,'name',prof.name,'allocationPct',pct,'commissionBase',base,'priorFaturacao',prior,'priorAgencyTake',prior_agency,'agentGross',agent_gross,'agencyGross',agency_gross,'royalties',royalty_agent,'royaltiesAgency',royalty_agency,'brokerPension',broker_pension,'pension',pension,'agentNet',net,'agentSplitPct',case when base>0 then agent_gross/base*100 else 0 end,'companyValidated',prof.company_validated,'overrideTotal',override_total));
  sum_ra:=sum_ra+royalty_agent;sum_rg:=sum_rg+royalty_agency;sum_p:=sum_p+pension;sum_net:=sum_net+net;sum_agency_net:=sum_agency_net+agency_gross-royalty_agency-override_total-broker_pension;
 end loop;
 completed:=coalesce(p_closed_at,now());
 insert into public.deal_financial_closures(deal_id,agency_id,property_reference,closed_at,gross,external_share,retained,royalties_agent,royalties_agency,pension_total,producer_total,agency_net,broker_pension_total,snapshot)
 values(d.id,d.agency_id,prop.reference,completed,gross,external_share,retained,sum_ra,sum_rg,sum_p,sum_net,sum_agency_net,broker_pension_sum,
  jsonb_build_object('planVersion','housepro-commission-v2','broker',jsonb_build_object('id',broker,'name',broker_name,'base',broker_base_sum,'pension',broker_pension_sum),'plan',plan,'financials',jsonb_build_object('status','ready','gross',gross,'externalShare',external_share,'retained',retained,'producers',producers),'overrides',overrides)) returning id into closure;
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

-- Add the previously missing broker liability as an auditable adjustment;
-- the original completed-deal snapshot remains intact.
do $$ declare c record; broker_base numeric; contribution numeric; begin
 for c in select f.*,s.broker_id from public.deal_financial_closures f
 join public.agency_finance_settings s on s.agency_id=f.agency_id
 where f.status='posted' and f.snapshot->>'planVersion'='housepro-commission-v1'
 and not exists(select 1 from public.agency_financial_adjustments a where a.closure_id=f.id) loop
  select sum((p->>'agencyGross')::numeric),sum(round((p->>'agencyGross')::numeric*0.02,2)) into broker_base,contribution
   from jsonb_array_elements(c.snapshot->'financials'->'producers')p;
  if contribution>c.agency_net then raise exception 'A parcela da agência não permite regularizar a pensão do broker sem revisão.'; end if;
  insert into public.agency_financial_adjustments(closure_id,agency_id,broker_id,contribution_base,rate,amount,reason)
  values(c.id,c.agency_id,c.broker_id,broker_base,2,contribution,'Regularização da contribuição de pensão do broker, anteriormente não registada.');
  insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id,contribution_base)
  values(c.property_reference,c.broker_id,(select name from public.profiles where id=c.broker_id),'pensao_broker',contribution,'pendente',c.id,c.deal_id,c.agency_id,c.broker_id,broker_base);
 end loop;
end $$;
