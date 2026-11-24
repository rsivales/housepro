-- Leadgen IDs only: PII stays exclusively in leads/lead_answers under their existing access rules.
create table public.meta_lead_receipts (
  leadgen_id text primary key check (leadgen_id ~ '^[0-9]{1,40}$'),
  page_id text not null check (page_id ~ '^[0-9]{1,40}$'),
  form_id text not null check (form_id ~ '^[0-9]{1,40}$'),
  status text not null default 'pending' check (status in ('pending','processed')),
  attempts integer not null default 0,
  last_error text,
  lead_id uuid references public.leads(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index meta_lead_receipts_pending_idx on public.meta_lead_receipts(received_at) where status='pending';
alter table public.meta_lead_receipts enable row level security;
revoke all on public.meta_lead_receipts from anon, authenticated;
-- A Meta form belongs to one campaign: conflicting mappings are rejected.
create unique index if not exists lead_forms_meta_id_unique on public.lead_forms(meta_form_id);
