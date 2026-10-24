alter table public.agency_cash_entries add column request_id uuid not null default gen_random_uuid();
create unique index agency_cash_request_unique on public.agency_cash_entries(agency_id,request_id);
