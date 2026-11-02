-- Transactional regression: monthly day clamping, idempotency, confirmation, stopping and RLS.
begin;
do $$
declare a uuid; actor uuid; request uuid:=gen_random_uuid(); series uuid; first_entry uuid; first_date date; start_date date:=(date_trunc('year',now())+interval '1 year 30 days')::date; stopped integer;
begin
 select s.agency_id,s.broker_id into a,actor from public.agency_finance_settings s join public.profiles p on p.id=s.broker_id and p.active limit 1;
 if a is null then raise exception 'Active broker agency required for regression'; end if;
 series:=public.create_agency_recurring_expenses(a,request,'rent','Renda de teste transacional',725.50,start_date,3,actor);
 if (select count(*) from public.agency_cash_entries where recurring_series_id=series and planned and voided_at is null)<>3 then raise exception 'Expected three planned installments'; end if;
 if (select array_agg(entry_date order by installment_number) from public.agency_cash_entries where recurring_series_id=series)
    <> array[start_date,(date_trunc('month',start_date)+interval '2 months - 1 day')::date,(date_trunc('month',start_date)+interval '2 months 30 days')::date] then raise exception 'Monthly day clamping failed'; end if;
 if public.create_agency_recurring_expenses(a,request,'rent','Renda de teste transacional',725.50,start_date,3,actor)<>series then raise exception 'Idempotency failed'; end if;
 if (select count(*) from public.agency_cash_entries where recurring_series_id=series)<>3 then raise exception 'Duplicate installments'; end if;
 select id,entry_date into first_entry,first_date from public.agency_cash_entries where recurring_series_id=series and installment_number=1;
 update public.agency_cash_entries set planned=false,updated_by=actor,updated_at=now() where id=first_entry;
 if (select count(*) from public.agency_expense_confirmation_events where entry_id=first_entry and actor_id=actor)<>1 then raise exception 'Confirmation not audited'; end if;
 stopped:=public.stop_agency_recurring_expenses(a,series,actor);
 if stopped<>2 or (select count(*) from public.agency_cash_entries where recurring_series_id=series and planned and voided_at is not null)<>2 then raise exception 'Future unconfirmed installments were not stopped'; end if;
 if (select voided_at from public.agency_cash_entries where id=first_entry) is not null then raise exception 'Confirmed payment was voided'; end if;
 if has_table_privilege('authenticated','public.agency_expense_series','SELECT') or has_table_privilege('authenticated','public.agency_expense_confirmation_events','SELECT') or has_function_privilege('authenticated','public.create_agency_recurring_expenses(uuid,uuid,text,text,numeric,date,int,uuid)','EXECUTE') then raise exception 'Accounting exposed to public clients'; end if;
end $$;
rollback;
select 'Recurring expenses verified; test writes rolled back.' as verified;
