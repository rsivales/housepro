-- Pipelines personalizados partilhados dentro da agência. A aplicação aplica o
-- âmbito da sessão antes de aceder à tabela, que não é exposta aos clientes.
create table public.crm_lead_pipelines (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  stages text[] not null check (cardinality(stages) between 2 and 12),
  created_at timestamptz not null default now()
);
create unique index crm_lead_pipelines_agency_name
  on public.crm_lead_pipelines (agency_id, lower(name));
alter table public.crm_lead_pipelines enable row level security;
revoke all on public.crm_lead_pipelines from public, anon, authenticated;
grant select, insert, update on public.crm_lead_pipelines to service_role;

alter table public.leads add column crm_archived_at timestamptz;
