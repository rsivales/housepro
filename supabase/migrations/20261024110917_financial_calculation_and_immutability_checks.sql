create or replace function helix_private.post_deal_finances(p_deal uuid, p_closed_at timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 d public.deals%rowtype; prop public.properties%rowtype; prof public.profiles%rowtype;
 existing uuid; closure uuid; completed timestamptz; gross numeric; external_share numeric:=0; retained numeric;
 allocation jsonb; allocations jsonb; band jsonb; plan jsonb:=helix_private.commission_plan_v1();
 producer uuid; pct numeric; base numeric; total_cents bigint; allocated_cents bigint:=0; base_cents bigint; allocation_count int; allocation_index int:=0;
 prior numeric; prior_agency numeric; remaining numeric; cursor_value numeric; band_size numeric; take_value numeric; agent_raw numeric; agent_gross numeric; agency_gross numeric;
 royalty_agent numeric; royalty_agency numeric; pension numeric; net numeric; sponsor uuid; sponsor_row public.profiles%rowtype; seen uuid[]; level_no int; override_amount numeric; override_total numeric; override_budget numeric;
 sum_ra numeric:=0; sum_rg numeric:=0; sum_p numeric:=0; sum_net numeric:=0; sum_agency_net numeric:=0;
 producers jsonb:='[]'::jsonb; overrides jsonb:='[]'::jsonb; p jsonb; o jsonb;
begin
 select * into d from public.deals where id=p_deal for update;
 if not found or d.stage::text<>'concluido' then raise exception 'finance_deal_not_completed'; end if;
 select id into existing from public.deal_financial_closures where deal_id=d.id and status='posted';
 if existing is not null then return existing; end if;
 if exists(select 1 from public.payouts where closure_id is null and (deal_id=d.id or deal_ref=d.id::text or deal_ref=(select reference from public.properties where id=d.property_id))) then
  raise exception 'Existem pagamentos antigos para este negócio. É necessária reconciliação antes de gerar novos valores.';
 end if;
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
  pension:=round(agent_gross*(plan->>'pensionPct')::numeric/100,2); net:=agent_gross-royalty_agent-pension;
  override_budget:=least(round(base*(select sum(value::numeric) from jsonb_array_elements_text(plan->'overrideTiers'))/100,2),greatest(0,agency_gross-royalty_agency));
  override_total:=0; sponsor:=prof.sponsor_id; seen:=array[producer];
  for level_no in 1..jsonb_array_length(plan->'overrideTiers') loop
   exit when sponsor is null or sponsor=any(seen);
   select * into sponsor_row from public.profiles where id=sponsor;
   exit when not found;
   override_amount:=least(round(base*(plan->'overrideTiers'->>(level_no-1))::numeric/100,2),greatest(0,override_budget-override_total));
   if override_amount>0 then overrides:=overrides||jsonb_build_array(jsonb_build_object('id',sponsor,'name',sponsor_row.name,'source',producer,'amount',override_amount,'level',level_no)); end if;
   override_total:=override_total+override_amount; seen:=array_append(seen,sponsor); sponsor:=sponsor_row.sponsor_id;
  end loop;
  producers:=producers||jsonb_build_array(jsonb_build_object('id',producer,'name',prof.name,'allocationPct',pct,'commissionBase',base,'priorFaturacao',prior,'priorAgencyTake',prior_agency,'agentGross',agent_gross,'agencyGross',agency_gross,'royalties',royalty_agent,'royaltiesAgency',royalty_agency,'pension',pension,'agentNet',net,'agentSplitPct',case when base>0 then agent_gross/base*100 else 0 end,'companyValidated',prof.company_validated,'overrideTotal',override_total));
  sum_ra:=sum_ra+royalty_agent;sum_rg:=sum_rg+royalty_agency;sum_p:=sum_p+pension;sum_net:=sum_net+net;sum_agency_net:=sum_agency_net+agency_gross-royalty_agency-override_total;
 end loop;
 completed:=coalesce(p_closed_at,now());
 insert into public.deal_financial_closures(deal_id,agency_id,property_reference,closed_at,gross,external_share,retained,royalties_agent,royalties_agency,pension_total,producer_total,agency_net,snapshot)
 values(d.id,d.agency_id,prop.reference,completed,gross,external_share,retained,sum_ra,sum_rg,sum_p,sum_net,sum_agency_net,
  jsonb_build_object('planVersion','housepro-commission-v1','plan',plan,'financials',jsonb_build_object('status','ready','gross',gross,'externalShare',external_share,'retained',retained,'producers',producers),'overrides',overrides)) returning id into closure;
 for p in select value from jsonb_array_elements(producers) loop
  insert into public.payouts(deal_ref,beneficiary_id,beneficiary_name,role,amount,status,closure_id,deal_id,agency_id,source_agent_id)
  values(prop.reference,(p->>'id')::uuid,p->>'name','producao',(p->>'agentNet')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid),
        (prop.reference,(p->>'id')::uuid,p->>'name','pensao',(p->>'pension')::numeric,'pendente',closure,d.id,d.agency_id,(p->>'id')::uuid);
  update public.profiles set monthly_gross=coalesce(monthly_gross,0)+(p->>'commissionBase')::numeric where id=(p->>'id')::uuid;
  insert into public.notifications(user_id,type,title,body,amount,href) values((p->>'id')::uuid,'pensao','Contribuição de pensão registada',prop.reference||' · Dedução apurada no fecho do negócio.',(p->>'pension')::numeric,'/app/fundo-pensao');
 end loop;
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

create or replace function helix_private.guard_closed_payout() returns trigger
language plpgsql set search_path='' as $$
declare linked uuid;
begin
 if TG_OP='DELETE' then linked:=old.closure_id; elsif TG_OP='UPDATE' then linked:=coalesce(old.closure_id,new.closure_id); else linked:=new.closure_id; end if;
 if linked is not null and auth.role() in('anon','authenticated') and pg_trigger_depth()<2 then
  if TG_OP in('INSERT','DELETE') then raise exception 'Os movimentos do fecho só podem ser gerados ou estornados pelo negócio.'; end if;
  if to_jsonb(new)-array['status','paid_at'] is distinct from to_jsonb(old)-array['status','paid_at'] then raise exception 'Os valores de um fecho financeiro são imutáveis. Reabra o negócio para regularizar.'; end if;
  if new.status is distinct from old.status and not ((old.status='pendente' and new.status='processado') or (old.status='processado' and new.status='pago')) then raise exception 'Transição de pagamento inválida.'; end if;
 end if;
 if TG_OP='DELETE' then return old; end if;return new;
end;$$;
revoke all on function helix_private.guard_closed_payout() from public,anon,authenticated;
