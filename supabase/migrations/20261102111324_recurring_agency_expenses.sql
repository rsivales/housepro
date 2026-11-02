-- Scheduled monthly expenses are forecasts until the broker confirms each actual payment.
create table public.agency_expense_series (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete restrict,
 request_id uuid not null,
 category text not null,
 description text not null,
 amount numeric(16,2) not null check(amount>0 and amount<=100000000),
 starts_on date not null,
 months integer not null check(months between 2 and 60),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 stopped_at timestamptz,
 stopped_by uuid references public.profiles(id),
 unique(agency_id,request_id)
);
alter table public.agency_expense_series enable row level security;
revoke all on public.agency_expense_series from anon,authenticated;
grant all on public.agency_expense_series to service_role;
create index agency_expense_series_scope on public.agency_expense_series(agency_id,created_at desc);

alter table public.agency_cash_entries
 add column planned boolean not null default false,
 add column recurring_series_id uuid references public.agency_expense_series(id) on delete restrict,
 add column installment_number integer,
 add constraint agency_recurring_installment_check check(
   (recurring_series_id is null and installment_number is null)
   or (recurring_series_id is not null and installment_number between 1 and 60 and kind='expense')
 );
create unique index agency_recurring_installment_unique on public.agency_cash_entries(recurring_series_id,installment_number)
 where recurring_series_id is not null;

create table public.agency_expense_confirmation_events (
 id uuid primary key default gen_random_uuid(),
 entry_id uuid not null references public.agency_cash_entries(id) on delete restrict,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.agency_expense_confirmation_events enable row level security;
revoke all on public.agency_expense_confirmation_events from anon,authenticated;
grant all on public.agency_expense_confirmation_events to service_role;
create index agency_expense_confirmations_scope on public.agency_expense_confirmation_events(agency_id,created_at desc);
create or replace function helix_private.audit_agency_expense_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.planned and not new.planned then
  if new.recurring_series_id is null or new.kind<>'expense' or new.voided_at is not null or new.updated_by is null then raise exception 'invalid_agency_expense_confirmation'; end if;
  insert into public.agency_expense_confirmation_events(entry_id,agency_id,actor_id) values(new.id,new.agency_id,new.updated_by);
 end if;
 return new;
end;$$;
revoke all on function helix_private.audit_agency_expense_confirmation() from public,anon,authenticated;
create trigger audit_agency_expense_confirmation after update of planned on public.agency_cash_entries
for each row execute function helix_private.audit_agency_expense_confirmation();

-- SECURITY INVOKER + service_role-only grant: called by authorized server routes.
create function public.create_agency_recurring_expenses(
 p_agency uuid,p_request uuid,p_category text,p_description text,p_amount numeric,p_start date,p_months int,p_actor uuid
) returns uuid language plpgsql security invoker set search_path='' as $$
declare series_id uuid; existing public.agency_expense_series%rowtype; i int; month_start date; bill_day date;
begin
 if p_agency is null or p_request is null or p_actor is null or p_category not in
  ('rent','utilities','telecom','portals','marketing','software','payroll','social_security','insurance','legal','maintenance','travel','taxes','other_expense')
  or length(btrim(coalesce(p_description,''))) not between 3 and 500 or p_amount is null or p_amount<=0 or p_amount>100000000 or p_amount<>round(p_amount,2)
  or p_start is null or p_months is null or p_months not between 2 and 60 then raise exception 'invalid_recurring_expense'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor and (p.agency_id=p_agency or p.role_key in ('admin','superadmin')) and p.active) then raise exception 'recurring_expense_actor_invalid'; end if;
 insert into public.agency_expense_series(agency_id,request_id,category,description,amount,starts_on,months,created_by)
 values(p_agency,p_request,p_category,btrim(p_description),p_amount,p_start,p_months,p_actor)
 on conflict(agency_id,request_id) do nothing returning id into series_id;
 if series_id is null then
  select * into existing from public.agency_expense_series where agency_id=p_agency and request_id=p_request;
  if not found or existing.category<>p_category or existing.description<>btrim(p_description) or existing.amount<>p_amount or existing.starts_on<>p_start or existing.months<>p_months or existing.created_by<>p_actor then raise exception 'recurring_expense_request_conflict'; end if;
  return existing.id;
 end if;
 for i in 0..p_months-1 loop
  month_start:=(date_trunc('month',p_start)::date+make_interval(months=>i))::date;
  bill_day:=month_start+(least(extract(day from p_start)::int,extract(day from (month_start+interval '1 month - 1 day'))::int)-1);
  insert into public.agency_cash_entries(agency_id,kind,entry_date,category,description,amount,created_by,request_id,planned,recurring_series_id,installment_number)
  values(p_agency,'expense',bill_day,p_category,btrim(p_description),p_amount,p_actor,gen_random_uuid(),true,series_id,i+1);
 end loop;
 return series_id;
end;$$;
revoke all on function public.create_agency_recurring_expenses(uuid,uuid,text,text,numeric,date,int,uuid) from public,anon,authenticated;
grant execute on function public.create_agency_recurring_expenses(uuid,uuid,text,text,numeric,date,int,uuid) to service_role;

create function public.stop_agency_recurring_expenses(p_agency uuid,p_series uuid,p_actor uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare affected int;
begin
 if not exists(select 1 from public.agency_expense_series s where s.id=p_series and s.agency_id=p_agency) then raise exception 'recurring_expense_missing'; end if;
 update public.agency_cash_entries set voided_at=now(),voided_by=p_actor,updated_by=p_actor,updated_at=now()
 where recurring_series_id=p_series and agency_id=p_agency and planned and voided_at is null and entry_date>=(now() at time zone 'Europe/Lisbon')::date;
 get diagnostics affected=row_count;
 update public.agency_expense_series set stopped_at=coalesce(stopped_at,now()),stopped_by=coalesce(stopped_by,p_actor)
 where id=p_series and agency_id=p_agency;
 return affected;
end;$$;
revoke all on function public.stop_agency_recurring_expenses(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.stop_agency_recurring_expenses(uuid,uuid,uuid) to service_role;
