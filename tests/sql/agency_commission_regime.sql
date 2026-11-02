-- Safe transactional verification of broker regime and ancillary consultant income.
begin;
do $$
declare a uuid; broker uuid; income uuid; prior_count integer; plan jsonb;
begin
 select agency_id,broker_id into a,broker from public.agency_finance_settings limit 1;
 if a is null then raise exception 'A broker agency is needed for this check'; end if;
 select count(*) into prior_count from public.deal_financial_closures where agency_id=a and status='posted';
 plan:=helix_private.commission_plan_v2()||jsonb_build_object('otherIncomeShares',jsonb_build_object('credito',55,'certificado',50,'parceria',50,'outros',50));
 update public.agency_finance_settings set commission_regime=plan,commission_version=commission_version+1,updated_by=broker where agency_id=a;
 if not exists(select 1 from public.agency_commission_regime_events where agency_id=a and new_regime=plan) then raise exception 'The commission change was not audited'; end if;
 if prior_count<>(select count(*) from public.deal_financial_closures where agency_id=a and status='posted') then raise exception 'A past closure was changed'; end if;
 insert into public.consultant_other_income(request_id,agency_id,consultant_id,category,partner_name,description,earned_on,gross_amount)
 values(gen_random_uuid(),a,broker,'credito','Parceiro de teste','Teste transacional sem persistência',current_date,123.45) returning id into income;
 update public.consultant_other_income set status='aprovado',consultant_share_pct=55,consultant_amount=67.90,agency_amount=55.55,regime_version=(select commission_version from public.agency_finance_settings where agency_id=a),decided_by=broker,decided_at=now() where id=income;
 update public.consultant_other_income set status='pago',decided_by=broker,decided_at=now() where id=income;
 if (select count(*) from public.consultant_other_income_events where income_id=income)<>3 then raise exception 'The income transitions were not audited'; end if;
 if (select count(*) from public.notifications where user_id=broker and body='Parceiro de teste · Teste transacional sem persistência' and type='comissao')<>3 then raise exception 'Broker/consultant notifications were not generated'; end if;
 if has_table_privilege('authenticated','public.consultant_other_income','SELECT') or has_table_privilege('anon','public.agency_commission_regime_events','SELECT') then raise exception 'Private accounting exposed to public clients'; end if;
end $$;
rollback;
select 'Broker plan, historical closures and other-income audit verified; test writes rolled back.' as verified;
