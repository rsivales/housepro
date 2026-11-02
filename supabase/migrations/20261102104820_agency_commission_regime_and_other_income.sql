-- Agency-specific commission rules apply only to future deal closures; each closure keeps its plan snapshot.
alter table public.agency_finance_settings
 add column commission_regime jsonb,
 add column commission_version integer not null default 0;
create table public.agency_commission_regime_events (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete restrict,
 old_version integer not null,
 new_version integer not null,
 old_regime jsonb,
 new_regime jsonb not null,
 actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.agency_commission_regime_events enable row level security;
revoke all on public.agency_commission_regime_events from anon,authenticated;
grant all on public.agency_commission_regime_events to service_role;
create index agency_regime_events_idx on public.agency_commission_regime_events(agency_id,created_at desc);
create or replace function helix_private.audit_commission_regime() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.commission_regime is distinct from old.commission_regime then
  if new.commission_version<>old.commission_version+1 or new.updated_by is null then raise exception 'commission_regime_version_invalid'; end if;
  if new.commission_regime->>'royaltiesPct'<>'3' or new.commission_regime->>'pensionPct'<>'2' or new.commission_regime->>'brokerPensionPct'<>'2' then raise exception 'commission_mandatory_contributions_invalid'; end if;
  insert into public.agency_commission_regime_events(agency_id,old_version,new_version,old_regime,new_regime,actor_id)
  values(new.agency_id,old.commission_version,new.commission_version,old.commission_regime,new.commission_regime,new.updated_by);
 end if;
 return new;
end;$$;
revoke all on function helix_private.audit_commission_regime() from public,anon,authenticated;
create trigger audit_commission_regime before update on public.agency_finance_settings
 for each row execute function helix_private.audit_commission_regime();

-- Separate partnership income from property production and cash receipts.
create table public.consultant_other_income (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 consultant_id uuid not null references public.profiles(id) on delete restrict,
 category text not null check(category in ('credito','certificado','parceria','outros')),
 partner_name text not null check(length(btrim(partner_name)) between 2 and 160),
 description text not null check(length(btrim(description)) between 3 and 500),
 earned_on date not null,
 gross_amount numeric(16,2) not null check(gross_amount>0 and gross_amount<=100000000),
 status text not null default 'pendente' check(status in ('pendente','aprovado','pago','recusado')),
 consultant_share_pct numeric(5,2),
 consultant_amount numeric(16,2),
 agency_amount numeric(16,2),
 regime_version integer,
 decided_by uuid references public.profiles(id),
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 unique(consultant_id,request_id),
 constraint other_income_split_check check(
   (status in ('pendente','recusado') and consultant_share_pct is null and consultant_amount is null and agency_amount is null)
   or (status in ('aprovado','pago') and consultant_share_pct between 0 and 100 and consultant_amount>=0 and agency_amount>=0 and consultant_amount+agency_amount=gross_amount)
 )
);
alter table public.consultant_other_income enable row level security;
revoke all on public.consultant_other_income from anon,authenticated;
grant all on public.consultant_other_income to service_role;
create index consultant_other_income_owner_idx on public.consultant_other_income(consultant_id,earned_on desc);
create index consultant_other_income_agency_idx on public.consultant_other_income(agency_id,earned_on desc);
create table public.consultant_other_income_events (
 id uuid primary key default gen_random_uuid(),
 income_id uuid not null references public.consultant_other_income(id) on delete restrict,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 old_status text,
 new_status text not null,
 actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.consultant_other_income_events enable row level security;
revoke all on public.consultant_other_income_events from anon,authenticated;
grant all on public.consultant_other_income_events to service_role;
create index consultant_other_income_events_idx on public.consultant_other_income_events(income_id,created_at desc);
create or replace function helix_private.audit_other_income() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.agency_id<>old.agency_id or new.consultant_id<>old.consultant_id or new.category<>old.category or new.partner_name<>old.partner_name or new.description<>old.description or new.earned_on<>old.earned_on or new.gross_amount<>old.gross_amount or new.request_id<>old.request_id then raise exception 'other_income_details_immutable'; end if;
  if not ((old.status='pendente' and new.status in('aprovado','recusado')) or (old.status='aprovado' and new.status='pago')) then raise exception 'other_income_transition_invalid'; end if;
 end if;
 insert into public.consultant_other_income_events(income_id,agency_id,old_status,new_status,actor_id)
 values(new.id,new.agency_id,case when TG_OP='INSERT' then null else old.status end,new.status,coalesce(new.decided_by,new.consultant_id));
 return new;
end;$$;
revoke all on function helix_private.audit_other_income() from public,anon,authenticated;
create trigger audit_other_income after insert or update on public.consultant_other_income
 for each row execute function helix_private.audit_other_income();

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
  jsonb_build_object('planVersion','housepro-commission-v3','broker',jsonb_build_object('id',broker,'name',broker_name,'base',broker_base_sum,'pension',broker_pension_sum),'plan',plan,'financials',jsonb_build_object('status','ready','gross',gross,'externalShare',external_share,'retained',retained,'producers',producers),'overrides',overrides)) returning id into closure;
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

