-- HousePro — Módulo CRM de Leads Meta (Facebook/Instagram).
--
-- Campanhas, formulários Meta, mapeamento pergunta→campo, regras de atribuição,
-- respostas e atividade das leads. Amplia a tabela `leads` (colunas OPCIONAIS,
-- retrocompatível) com os conceitos do módulo. Depende de 0001–0008.
--
-- SEGURANÇA: nenhuma coluna guarda tokens Meta. `meta_connections.token_ref`
-- guarda apenas uma REFERÊNCIA a um segredo mantido server-side (env/vault).
--
-- Idempotente: pode ser reexecutada (if not exists / drop policy if exists).

-- ─────────────────────────────────────────────────────────────
-- Ligações Meta (página/conta) — sem tokens em claro
-- ─────────────────────────────────────────────────────────────
create table if not exists meta_connections (
  id           uuid primary key default gen_random_uuid(),
  page_id      text not null,
  page_name    text,
  ig_id        text,
  ig_name      text,
  token_ref    text,                         -- referência a segredo server-side (NUNCA o token)
  scopes       text[] default '{}',
  status       text not null default 'demo', -- demo | ligada | desligada | erro
  agency_id    uuid references agencies (id) on delete set null,
  created_at   timestamptz not null default now(),
  connected_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- Campanhas
-- ─────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null default 'OTHER', -- BUYER|SELLER|PROPERTY|PROPERTY_SET|RECRUITMENT|INSTITUTIONAL|OTHER
  owner_type       text not null default 'AGENCY', -- AGENCY | AGENT  (1) DONO
  owner_id         text,                           -- agencyId ou agentId
  responsible_id   uuid references profiles (id) on delete set null, -- (2) RESPONSÁVEL
  objective        text,
  meta_campaign_id text,                           -- referência externa (Meta Ads)
  status           text not null default 'rascunho', -- rascunho|ativa|pausada|terminada
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists campaigns_owner_idx on campaigns (owner_type, owner_id);
create index if not exists campaigns_responsible_idx on campaigns (responsible_id);

-- Associação campanha ↔ imóvel (PROPERTY / PROPERTY_SET)
create table if not exists campaign_properties (
  campaign_id  uuid not null references campaigns (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  property_ref text,
  primary key (campaign_id, property_id)
);

-- ─────────────────────────────────────────────────────────────
-- Formulários Meta e perguntas
-- ─────────────────────────────────────────────────────────────
create table if not exists lead_forms (
  id           uuid primary key default gen_random_uuid(),
  meta_form_id text not null,
  name         text not null,
  campaign_id  uuid references campaigns (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists lead_forms_campaign_idx on lead_forms (campaign_id);

create table if not exists lead_form_questions (
  id        uuid primary key default gen_random_uuid(),
  form_id   uuid not null references lead_forms (id) on delete cascade,
  key       text not null,             -- field key da pergunta no Meta
  label     text,
  type      text not null default 'text', -- text|email|phone|select|multiselect|number|date|boolean|other
  options   text[] default '{}',
  position  integer default 0
);
create index if not exists lead_form_questions_form_idx on lead_form_questions (form_id);

-- Mapeamento pergunta → campo normalizado da lead
create table if not exists field_mappings (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references lead_forms (id) on delete cascade,
  question_key text not null,
  lead_field   text not null,          -- name|email|contact|message|intent|preferredAt|propertyRef|budget|zone|custom
  note         text,
  primary key (id)
);
create unique index if not exists field_mappings_form_q_idx on field_mappings (form_id, question_key);

-- ─────────────────────────────────────────────────────────────
-- Regras de atribuição
-- ─────────────────────────────────────────────────────────────
create table if not exists assignment_rules (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  strategy    text not null default 'unassigned', -- specific|team|round_robin|zone|property|unassigned
  agent_id    uuid references profiles (id) on delete set null,  -- specific
  team_id     uuid references teams (id) on delete set null,     -- team
  pool        uuid[] default '{}',                               -- round_robin
  rr_index    integer default 0,                                 -- round_robin (estado)
  zone_map    jsonb,                                             -- zone → destino
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists assignment_rules_campaign_idx on assignment_rules (campaign_id);

-- ─────────────────────────────────────────────────────────────
-- Ampliação da tabela `leads` (colunas opcionais — retrocompatível)
-- ─────────────────────────────────────────────────────────────
alter table leads
  add column if not exists campaign_id          uuid references campaigns (id) on delete set null,
  add column if not exists form_id              uuid references lead_forms (id) on delete set null,
  add column if not exists commercial_origin_id uuid references profiles (id) on delete set null, -- (3)
  add column if not exists assigned_agent_id    uuid references profiles (id) on delete set null, -- (4)
  add column if not exists assigned_team_id     uuid references teams (id) on delete set null,
  add column if not exists pipeline             text,
  add column if not exists stage                integer default 0,
  add column if not exists qualification        text default 'novo', -- novo|qualificado|desqualificado|duplicado
  add column if not exists score                integer,
  add column if not exists unassigned           boolean default false,
  add column if not exists zone                 text,
  add column if not exists budget               text,
  add column if not exists consent              jsonb;   -- { base, at, text } (RGPD)

create index if not exists leads_campaign_idx on leads (campaign_id);
create index if not exists leads_assigned_idx on leads (assigned_agent_id);
create index if not exists leads_unassigned_idx on leads (unassigned) where unassigned = true;

-- Respostas do formulário (uma linha por pergunta) — PII a mascarar em logs
create table if not exists lead_answers (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  question_key text not null,
  label        text,
  value        text,
  pii          boolean default false,
  created_at   timestamptz not null default now()
);
create index if not exists lead_answers_lead_idx on lead_answers (lead_id);

-- Linha do tempo / atividade da lead
create table if not exists lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads (id) on delete cascade,
  type       text not null,       -- created|assigned|reassigned|contacted|qualified|disqualified|note|stage|status|message
  actor_id   uuid references profiles (id) on delete set null,
  actor_name text,
  note       text,
  from_val   text,
  to_val     text,
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_idx on lead_activities (lead_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS — staff gere tudo; consultor vê o que lhe diz respeito
-- ─────────────────────────────────────────────────────────────
alter table meta_connections   enable row level security;
alter table campaigns          enable row level security;
alter table campaign_properties enable row level security;
alter table lead_forms         enable row level security;
alter table lead_form_questions enable row level security;
alter table field_mappings     enable row level security;
alter table assignment_rules   enable row level security;
alter table lead_answers       enable row level security;
alter table lead_activities    enable row level security;

-- helper local: é staff de gestão?
create or replace function is_meta_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid()
    and p.role_key in ('coordenador','diretor','admin','superadmin'))
$$;

-- meta_connections: só staff (contém referências a segredos).
drop policy if exists meta_connections_staff on meta_connections;
create policy meta_connections_staff on meta_connections
  for all using (is_meta_staff()) with check (is_meta_staff());

-- campaigns: staff gere tudo; consultor vê as que possui/é responsável.
drop policy if exists campaigns_staff on campaigns;
create policy campaigns_staff on campaigns
  for all using (is_meta_staff()) with check (is_meta_staff());
drop policy if exists campaigns_own_read on campaigns;
create policy campaigns_own_read on campaigns
  for select using (
    responsible_id = auth.uid()
    or (owner_type = 'AGENT' and owner_id = auth.uid()::text)
  );

-- campaign_properties / lead_forms / questions / mappings / rules:
-- leitura a autenticados, escrita a staff.
drop policy if exists campaign_properties_read on campaign_properties;
create policy campaign_properties_read on campaign_properties
  for select using (auth.uid() is not null);
drop policy if exists campaign_properties_write on campaign_properties;
create policy campaign_properties_write on campaign_properties
  for all using (is_meta_staff()) with check (is_meta_staff());

drop policy if exists lead_forms_read on lead_forms;
create policy lead_forms_read on lead_forms
  for select using (auth.uid() is not null);
drop policy if exists lead_forms_write on lead_forms;
create policy lead_forms_write on lead_forms
  for all using (is_meta_staff()) with check (is_meta_staff());

drop policy if exists lead_form_questions_read on lead_form_questions;
create policy lead_form_questions_read on lead_form_questions
  for select using (auth.uid() is not null);
drop policy if exists lead_form_questions_write on lead_form_questions;
create policy lead_form_questions_write on lead_form_questions
  for all using (is_meta_staff()) with check (is_meta_staff());

drop policy if exists field_mappings_read on field_mappings;
create policy field_mappings_read on field_mappings
  for select using (auth.uid() is not null);
drop policy if exists field_mappings_write on field_mappings;
create policy field_mappings_write on field_mappings
  for all using (is_meta_staff()) with check (is_meta_staff());

drop policy if exists assignment_rules_read on assignment_rules;
create policy assignment_rules_read on assignment_rules
  for select using (auth.uid() is not null);
drop policy if exists assignment_rules_write on assignment_rules;
create policy assignment_rules_write on assignment_rules
  for all using (is_meta_staff()) with check (is_meta_staff());

-- lead_answers / lead_activities: staff, ou o agente responsável/origem da lead.
drop policy if exists lead_answers_scope on lead_answers;
create policy lead_answers_scope on lead_answers
  for all using (
    is_meta_staff()
    or exists (select 1 from leads l where l.id = lead_id
      and (l.assigned_agent_id = auth.uid() or l.commercial_origin_id = auth.uid() or l.owner_id = auth.uid()))
  ) with check (
    is_meta_staff()
    or exists (select 1 from leads l where l.id = lead_id
      and (l.assigned_agent_id = auth.uid() or l.commercial_origin_id = auth.uid() or l.owner_id = auth.uid()))
  );

drop policy if exists lead_activities_scope on lead_activities;
create policy lead_activities_scope on lead_activities
  for all using (
    is_meta_staff()
    or exists (select 1 from leads l where l.id = lead_id
      and (l.assigned_agent_id = auth.uid() or l.commercial_origin_id = auth.uid() or l.owner_id = auth.uid()))
  ) with check (
    is_meta_staff()
    or exists (select 1 from leads l where l.id = lead_id
      and (l.assigned_agent_id = auth.uid() or l.commercial_origin_id = auth.uid() or l.owner_id = auth.uid()))
  );
