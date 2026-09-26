-- HousePro / Helix — Meta + TikTok num único módulo de leads sociais.
-- Aditiva e idempotente. Depende de 0020_meta_crm.sql e 0021_meta_completion.sql.

alter type lead_source add value if not exists 'tiktok';

alter table public.campaigns
  add column if not exists provider text not null default 'meta',
  add column if not exists external_campaign_id text;

update public.campaigns
set external_campaign_id = meta_campaign_id
where external_campaign_id is null and meta_campaign_id is not null;

create unique index if not exists campaigns_provider_external_uidx
  on public.campaigns(provider, external_campaign_id)
  where external_campaign_id is not null;

alter table public.lead_forms
  alter column meta_form_id drop not null,
  add column if not exists provider text not null default 'meta',
  add column if not exists external_form_id text;

update public.lead_forms
set external_form_id = meta_form_id
where external_form_id is null and meta_form_id is not null;

create unique index if not exists lead_forms_provider_external_uidx
  on public.lead_forms(provider, external_form_id)
  where external_form_id is not null;

alter table public.leads
  add column if not exists provider text;

update public.leads
set provider = 'meta'
where provider is null
  and campaign_id is not null
  and source::text in ('facebook', 'instagram');

create unique index if not exists leads_provider_external_uidx
  on public.leads(provider, external_id)
  where provider is not null and external_id is not null;

create table if not exists public.tiktok_connections (
  id uuid primary key default gen_random_uuid(),
  advertiser_id text not null,
  business_center_id text,
  display_name text not null default 'TikTok Lead Generation',
  token_ref text,
  scopes text[] not null default '{}',
  status text not null default 'desligada',
  agency_id uuid references public.agencies(id) on delete set null,
  created_at timestamptz not null default now(),
  connected_at timestamptz,
  constraint tiktok_connections_status_check
    check (status in ('demo', 'ligada', 'desligada', 'erro'))
);

create table if not exists public.social_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  external_lead_id text not null,
  external_campaign_id text,
  external_form_id text,
  status text not null default 'received',
  attempt_count integer not null default 1,
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint social_webhook_events_provider_check check (provider in ('meta', 'tiktok')),
  constraint social_webhook_events_status_check
    check (status in ('received', 'processed', 'failed', 'ignored')),
  unique(provider, external_event_id)
);

create index if not exists social_webhook_events_status_idx
  on public.social_webhook_events(provider, status, received_at desc);

alter table public.tiktok_connections enable row level security;
alter table public.social_webhook_events enable row level security;

drop policy if exists tiktok_connections_staff on public.tiktok_connections;
create policy tiktok_connections_staff on public.tiktok_connections
  for all using (public.is_meta_staff()) with check (public.is_meta_staff());

drop policy if exists social_webhook_events_staff_read on public.social_webhook_events;
create policy social_webhook_events_staff_read on public.social_webhook_events
  for select using (public.is_meta_staff());

comment on table public.social_webhook_events is
  'Auditoria técnica de webhooks sem respostas nem dados pessoais.';
