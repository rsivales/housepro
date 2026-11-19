begin;
do $$
declare actor uuid; producer uuid; broker uuid; agency_id_value uuid; property_id_value uuid; request_id_value uuid; test_deal uuid; closure uuid; c jsonb; plan_version integer; has_company boolean; expected numeric; old_ids uuid[]; digest text;
begin
 select id into actor from public.profiles where active and role_key='superadmin' limit 1;
 select p.id,p.agency_id,p.company_validated into producer,agency_id_value,has_company from public.profiles p where p.active and p.monthly_gross>0 order by p.monthly_gross desc limit 1;
 select broker_id into broker from public.agency_finance_settings where agency_id=agency_id_value;
 select property_id into property_id_value from public.deals where agency_id=agency_id_value and property_id is not null limit 1;
 select array_agg(id),md5(string_agg(id::text||snapshot::text,'' order by id)) into old_ids,digest from public.deal_financial_closures;
 c:=helix_private.agent_cycle_summary(producer);
 request_id_value:=public.request_agency_management(agency_id_value,producer,'agent_policy',jsonb_build_object('joinedOn',(now() at time zone 'Europe/Lisbon')::date,'annualRevenueGoal',60000,'annualListingsGoal',12),(c->>'policyVersion')::integer,'Teste de novo fecho após reinício do ciclo anual',broker);
 perform public.decide_agency_management(request_id_value,true,'Teste transacional autorizado da data de entrada',actor);
 c:=helix_private.agent_cycle_summary(producer);
 assert (c->>'gross')::numeric=0,'Fixture requires historical production before today';
 update public.properties set commission_split=jsonb_build_array(jsonb_build_object('agent_id',producer,'pct',100)) where id=property_id_value;
 insert into public.deals(property_id,agency_id,angariador_id,stage,amount,commission_type,commission_fixed)
 values(property_id_value,agency_id_value,producer,'concluido',200000,'fixed',1000) returning id into test_deal;
 select id,snapshot->'financials'->'producers'->0 into closure,c from public.deal_financial_closures where deal_id=test_deal and status='posted';
 expected:=case when has_company then 500 else 400 end;
 assert (c->>'priorFaturacao')::numeric=0,'Posting used lifetime cached turnover instead of new cycle';
 assert (c->>'agentGross')::numeric=expected,'New cycle did not return to first band';
 assert (c->>'cycleStart')::date=(now() at time zone 'Europe/Lisbon')::date,'Posting lacks anniversary snapshot';
 assert (helix_private.agent_cycle_summary(producer)->>'gross')::numeric=1000,'Cycle did not accrue exactly once';
 assert helix_private.post_deal_finances(test_deal)=closure,'Repeat posting created a second closure';
 assert (helix_private.agent_cycle_summary(producer)->>'gross')::numeric=1000,'Repeat posting doubled annual production';
 assert (select retained=agency_net+(select sum(amount) from public.payouts where closure_id=closure) from public.deal_financial_closures where id=closure),'New cycle financial allocation does not conserve cents';
 assert digest=(select md5(string_agg(id::text||snapshot::text,'' order by id)) from public.deal_financial_closures where id=any(old_ids)),'Historic snapshot changed';
end $$;
rollback;
select 'Actual post-anniversary closure uses the reset band, preserves cents, accrues once, and keeps history intact; rolled back.' as verified;
