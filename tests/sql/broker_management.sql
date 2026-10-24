begin;
do $$
declare a uuid; broker uuid; entry uuid; request uuid:=gen_random_uuid(); got boolean:=false; total numeric; c record;
begin
 select s.agency_id,s.broker_id into a,broker from public.agency_finance_settings s join public.profiles p on p.id=s.broker_id where p.active limit 1;
 if a is null then raise exception 'Fixture requires a designated broker'; end if;
 -- Cash inserts are idempotent per agency/request and every state is auditable.
 insert into public.agency_cash_entries(agency_id,kind,entry_date,category,description,amount,created_by,request_id)
 values(a,'expense',current_date,'software','Teste transacional sem persistência',15.25,broker,request) returning id into entry;
 begin insert into public.agency_cash_entries(agency_id,kind,entry_date,category,description,amount,created_by,request_id)
 values(a,'expense',current_date,'software','Teste transacional sem persistência',15.25,broker,request);
 exception when unique_violation then got:=true; end;
 if not got then raise exception 'Repeated request created a duplicate cash movement'; end if;
 update public.agency_cash_entries set voided_at=now(),voided_by=broker,updated_by=broker where id=entry;
 update public.agency_cash_entries set voided_at=null,voided_by=null,updated_by=broker where id=entry;
 if (select count(*) from public.agency_cash_entry_events where entry_id=entry)<>3 then raise exception 'Create, void and restore were not all recorded'; end if;
 for c in select f.*,coalesce(x.amount,0) as adjustment from public.deal_financial_closures f left join public.agency_financial_adjustments x on x.closure_id=f.id where f.status='posted' and f.agency_id=a loop
  select coalesce(sum(amount),0) into total from public.payouts where closure_id=c.id and role='pensao_broker' and status<>'anulado';
  if total<>c.broker_pension_total+c.adjustment then raise exception 'Broker contribution does not match its posted liability'; end if;
  if total<>(select sum(round((p->>'agencyGross')::numeric*0.02,2)) from jsonb_array_elements(c.snapshot->'financials'->'producers')p) then raise exception 'Broker pension is not 2 percent of the agency share'; end if;
  if c.retained<>c.agency_net-c.adjustment+(select sum(amount) from public.payouts where closure_id=c.id and status<>'anulado') then raise exception 'Agency and personal liabilities no longer conserve commission'; end if;
 end loop;
 if has_table_privilege('authenticated','public.agency_cash_entries','SELECT') or has_table_privilege('anon','public.agency_cash_entries','SELECT') then raise exception 'Cash entries bypass the server agency boundary'; end if;
end $$;
rollback;
select 'Verified broker contribution, separate agency/agent accounting, cash request idempotency, void/restore audit and private cash access. Test writes rolled back.' as verified;
