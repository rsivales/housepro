-- Transactional checks against existing fixtures. Nothing is persisted.
begin;
do $$
declare master uuid; broker uuid; v_agency uuid; candidate uuid; rid uuid; policy_rid uuid; v integer; baseline text; c jsonb; s date; e date; plan jsonb; blocked boolean:=false; first_count integer;
begin
 select id into master from public.profiles where active and role_key in ('admin','superadmin') order by role_key desc limit 1;
 select agency_id,broker_id into v_agency,broker from public.agency_finance_settings where broker_id is not null limit 1;
 select id into candidate from public.profiles where agency_id=v_agency and active and role_key not in ('admin','superadmin') limit 1;
 if master is null or candidate is null or broker is null then raise exception 'Missing verification fixtures'; end if;
 select md5(coalesce(string_agg(id::text||snapshot::text,'' order by id),'')) into baseline from public.deal_financial_closures;
 select starts_on,ends_on into s,e from helix_private.commission_cycle_bounds('2024-02-29','2025-02-28');
 assert s='2025-02-28'::date and e='2026-02-28'::date,'Leap-year anniversary failed';
 select starts_on,ends_on into s,e from helix_private.commission_cycle_bounds('2024-02-29','2028-02-28');
 assert s='2027-02-28'::date and e='2028-02-29'::date,'Leap-year anchor drifted';
 c:=helix_private.agent_cycle_summary(candidate);
 assert (helix_private.agent_cycle_summary(candidate,((c->>'cycleEnd')::date::text||' 12:00 Europe/Lisbon')::timestamptz)->>'gross')::numeric=0,'Cycle did not reset at anniversary';
 select commission_version into v from public.agency_finance_settings where agency_id=v_agency;
 plan:=helix_private.commission_plan_v2()||jsonb_build_object('otherIncomeShares',jsonb_build_object('credito',51,'certificado',50,'parceria',50,'outros',50),'overrideTiers',jsonb_build_array(4,3,2,1));
 begin
  update public.agency_finance_settings set commission_regime=plan,commission_version=commission_version+1,updated_by=broker where agency_id=v_agency;
 exception when others then
  if sqlerrm='brand_approval_required' then blocked:=true;else raise;end if;
 end;
 assert blocked,'Direct override update was accepted';
 rid:=public.request_agency_management(v_agency,null,'regime',plan,v,'Pedido de teste transacional do broker',broker);
 assert (select commission_version=v from public.agency_finance_settings where agency_id=v_agency),'Proposal changed live regime';
 blocked:=false;
 begin perform public.decide_agency_management(rid,true,'Tentativa sem permissão',candidate);
 exception when others then if sqlerrm='forbidden' then blocked:=true;else raise;end if;end;
 if not exists(select 1 from public.profiles where id=candidate and role_key in ('admin','superadmin')) then assert blocked,'Non-master could approve';end if;
 perform public.decide_agency_management(rid,true,'Autorização transacional para teste',master);
 assert (select commission_version=v+1 and commission_regime=plan from public.agency_finance_settings where agency_id=v_agency),'Approval not applied';
 assert exists(select 1 from public.agency_commission_regime_events where agency_id=v_agency and new_regime=plan),'Approval audit missing';
 blocked:=false;
 begin perform public.decide_agency_management(rid,true,'Segunda decisão indevida',master);
 exception when others then if sqlerrm='request_not_pending' then blocked:=true;else raise;end if;end;
 assert blocked,'Approval was applied twice';
 c:=helix_private.agent_cycle_summary(candidate);
 policy_rid:=public.request_agency_management(v_agency,candidate,'agent_policy',jsonb_build_object('joinedOn',((now() at time zone 'Europe/Lisbon')::date+5-interval '1 year')::date,'annualRevenueGoal',65000,'annualListingsGoal',12),(c->>'policyVersion')::integer,'Confirmar entrada e objetivos num teste',broker);
 assert not exists(select 1 from public.agent_commission_policies where agent_id=candidate),'Policy applied before approval';
 perform public.decide_agency_management(policy_rid,true,'Data e objetivos conferidos pela Marca',master);
 c:=helix_private.agent_cycle_summary(candidate);
 assert (c->>'dateConfirmed')::boolean and (c->>'annualRevenueGoal')::numeric=65000 and (c->>'annualListingsGoal')::integer=12,'Approved policy not used';
 select count(*) into first_count from public.commission_cycle_alerts;
 perform helix_private.notify_commission_cycles();
 assert first_count<(select count(*) from public.commission_cycle_alerts),'Cycle reminder was not generated';
 first_count:=(select count(*) from public.commission_cycle_alerts);
 perform helix_private.notify_commission_cycles();
 assert first_count=(select count(*) from public.commission_cycle_alerts),'Repeated cycle alerts';
 assert baseline=(select md5(coalesce(string_agg(id::text||snapshot::text,'' order by id),'')) from public.deal_financial_closures),'Historical closure changed';
 assert not has_function_privilege('authenticated','public.decide_agency_management(uuid,boolean,text,uuid)','EXECUTE'),'Approval RPC exposed';
 assert not has_function_privilege('anon','public.commission_cycle_summaries(uuid[])','EXECUTE'),'Private production exposed';
 assert not has_table_privilege('authenticated','public.agent_commission_policies','UPDATE'),'Policy writable by client';
end $$;
rollback;
select 'Anniversaries, protected overrides, proposals, decisions, policy audit, idempotent alerts and unchanged history verified; rolled back.' as verified;
