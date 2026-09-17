-- ============================================================
-- migration_all.sql — TODAS as migrações do imóvel/CRM, por ordem
-- Corre este ficheiro de uma vez no SQL Editor do Supabase.
-- Todos os blocos são idempotentes (seguro correr mais do que uma vez).
-- ============================================================

-- ── migration_property_categories_visibility.sql ──────────────────────────────────────────
-- Fatia 2 — Categorias e visibilidade do imóvel
-- Corre isto no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- Tipo de negócio detalhado (venda, permuta, trespasse, arrendamento ao ano,
  -- curta duração, timesharing, cedência de posição…). `operation` continua a
  -- ser a versão coarse (venda/arrendamento) usada nos filtros/portais.
  add column if not exists business_type text,
  -- Preço visível ao público (auto-oculto quando vendido).
  add column if not exists price_visible boolean not null default true,
  -- Privacidade da morada no mapa público: exact | approx | locality | hidden.
  add column if not exists location_privacy text not null default 'approx';

-- Preenche o tipo de negócio nos imóveis já existentes a partir da operação.
-- operation é um enum — converte para texto ao copiar para business_type.
update properties
  set business_type = coalesce(business_type, operation::text)
  where business_type is null;

-- ── migration_property_gallery_meta.sql ──────────────────────────────────────────
-- Fatia 3 — Ordenação da galeria + divisão por fotografia
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.
-- A ORDEM das fotos já é dada pela ordem do array `gallery` (a 1.ª = capa);
-- esta coluna guarda a divisão/etiqueta de cada foto, alinhada por URL.

alter table properties
  add column if not exists gallery_meta jsonb;

-- ── migration_property_cmi_dates.sql ──────────────────────────────────────────
-- Fatia 4 — Contrato de mediação (CMI) e validades
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- CMI exclusivo (true) ou aberto (false). Aberto oculta a morada pública.
  add column if not exists cmi_exclusive boolean not null default true,
  -- Renovação automática do CMI.
  add column if not exists cmi_renewable boolean not null default false,
  -- Início do CMI e duração (meses) — validade = início + meses.
  add column if not exists cmi_start date,
  add column if not exists cmi_months integer,
  -- Validade do certificado energético — alerta de expiração.
  add column if not exists energy_cert_expiry date;

-- ── migration_property_details_owner_tags.sql ──────────────────────────────────────────
-- Fatia 5a — Encargos, proprietário, etiquetas, flags e campos de empreendimento
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- Encargos correntes (IMI, condomínio…): [{label, value, period}]
  add column if not exists expenses jsonb,
  -- Contactos do proprietário — PRIVADOS (nunca expostos ao público).
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists owner_email text,
  add column if not exists owner_nif text,
  -- Etiquetas (manuais + automáticas): array de texto.
  add column if not exists tags text[],
  -- Flags operacionais.
  add column if not exists has_placa boolean not null default false,
  add column if not exists has_keys boolean not null default false,
  -- Empreendimento: campos extra para exportação/portais.
  add column if not exists development_typologies text,
  add column if not exists development_price_from numeric,
  add column if not exists development_delivery text;

-- ── migration_property_state_offmarket.sql ──────────────────────────────────────────
-- Fatia 5b — Estado (activo/pendente/inactivo) + fora de mercado
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.
-- Só "activo" e NÃO fora-de-mercado aparecem ao público/portais; os restantes
-- ficam visíveis apenas à agência (internamente).

alter table properties
  add column if not exists listing_state text not null default 'activo',
  add column if not exists off_market boolean not null default false;

-- ── migration_agent_requests.sql ──────────────────────────────────────────
-- #18 — Pedidos de co-angariação (multi-agente)
-- Um agente pede para entrar num imóvel; o broker/coordenação aprova ou recusa.
-- Ao aprovar, o agente é adicionado a properties.co_agent_ids (co-angariação).
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

create table if not exists property_agent_requests (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pendente',   -- pendente | aprovado | recusado
  note         text,
  decided_by   uuid references profiles(id),
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (property_id, requester_id)
);

alter table property_agent_requests enable row level security;

-- O próprio agente vê e cria os seus pedidos. As decisões da coordenação/broker
-- são feitas por rotas de servidor com service_role (que ignora o RLS).
drop policy if exists "req_select_own" on property_agent_requests;
create policy "req_select_own" on property_agent_requests
  for select using (requester_id = auth.uid());

drop policy if exists "req_insert_own" on property_agent_requests;
create policy "req_insert_own" on property_agent_requests
  for insert with check (requester_id = auth.uid());

-- ── migration_deals.sql ──────────────────────────────────────────
-- Negócios (processo transacional) persistidos + eventos de fase.
-- Faz a automação do estado do imóvel funcionar de verdade: ao avançar a fase
-- do negócio, o imóvel muda de estado (reserva→reservado, cpcv→cpcv,
-- escritura/concluído→vendido). Corre no Supabase (SQL Editor). Seguro repetir.
-- (Se já correste o setup completo, estas tabelas já existem — não faz mal.)

do $$ begin
  create type deal_stage as enum
    ('proposta_enviada','proposta_aceite','reserva','cpcv','escritura','concluido','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_stage as enum
    ('sem_credito','pedido','aprovacao','avaliacao','escritura_marcada');
exception when duplicate_object then null; end $$;

create table if not exists deals (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references properties (id) on delete set null,
  agency_id     uuid not null references agencies (id),
  buyer_user_id  uuid references auth.users (id),
  seller_user_id uuid references auth.users (id),
  buyer_name   text,
  seller_name  text,
  angariador_id           uuid references profiles (id),
  consultor_comprador_id  uuid references profiles (id),
  coordenador_id          uuid references profiles (id),
  stage        deal_stage not null default 'proposta_enviada',
  credit_stage credit_stage not null default 'sem_credito',
  amount       numeric(12,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists deals_agency_idx on deals (agency_id);
create index if not exists deals_property_idx on deals (property_id);

create table if not exists deal_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals (id) on delete cascade,
  track      text not null default 'transacional',
  from_stage text,
  to_stage   text not null,
  actor_id   uuid references profiles (id),
  note       text,
  created_at timestamptz not null default now()
);

-- Só o servidor (service_role) lê/escreve negócios; RLS activo sem políticas
-- públicas fecha o acesso directo dos clientes.
alter table deals enable row level security;
alter table deal_events enable row level security;

-- ── migration_owner_token.sql ──────────────────────────────────────────
-- Portal do proprietário — link só de leitura para o dono acompanhar o imóvel
-- (estado, visitas, interessados, reserva/CPCV/escritura).
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  add column if not exists owner_token text;

-- Token único e indexado (para a página pública /proprietario/[token]).
create unique index if not exists properties_owner_token_idx
  on properties (owner_token) where owner_token is not null;

-- ── migration_lead_pipeline.sql ──────────────────────────────────────────
-- Pipeline de LEADS no CRM (separado dos negócios).
-- Garante as colunas usadas pelo kanban de leads. Corre no Supabase (SQL
-- Editor). Seguro para correr mais do que uma vez.
-- (Se já correste o setup completo, estas colunas já existem.)

alter table leads
  add column if not exists pipeline text,
  add column if not exists stage integer default 0;


-- ── migration_documents_persist.sql ──────────────────────────────────────
-- Documentos do imóvel (ficheiros, não só o tipo) passam a persistir.
alter table properties add column if not exists documents_meta jsonb;

-- ── migration_profile_change_requests.sql ────────────────────────────────
-- Pedidos de alteração de perfil (nome, foto, WhatsApp) — o próprio consultor
-- propõe, a coordenação/administração aprova. Ver ficheiro próprio para
-- comentários completos.

create table if not exists profile_change_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  name        text,
  photo_url   text,
  whatsapp    text,
  status      text not null default 'pendente',   -- pendente | aprovado | recusado | cancelado
  note        text,
  decided_by  uuid references profiles(id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table profile_change_requests enable row level security;

drop policy if exists "profile_req_select_own" on profile_change_requests;
create policy "profile_req_select_own" on profile_change_requests
  for select using (profile_id = auth.uid());

drop policy if exists "profile_req_insert_own" on profile_change_requests;
create policy "profile_req_insert_own" on profile_change_requests
  for insert with check (profile_id = auth.uid());

drop policy if exists "profile_req_update_own_pending" on profile_change_requests;
create policy "profile_req_update_own_pending" on profile_change_requests
  for update
  using (profile_id = auth.uid() and status = 'pendente')
  with check (profile_id = auth.uid() and status in ('pendente', 'cancelado'));

-- ── migration_fix_has_role.sql ───────────────────────────────────────────
-- CRÍTICO — has_role() dependia de user_roles (nunca populada); passa a
-- verificar profiles.role diretamente. Corrige silenciosamente todas as
-- políticas RLS que dependem de has_role() (site_settings, etc.).
create or replace function has_role(r user_role) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (p.role = r or p.role = 'admin')
  )
$$;

-- ── migration_fix_plans_license.sql ──────────────────────────────────────
-- CRÍTICO — coluna `plans` nunca existiu (a app já a enviava em cada
-- gravação, o que rejeitava a gravação inteira). + licença averbada.
alter table properties add column if not exists plans text[] default '{}';
alter table properties add column if not exists license_endorsed boolean default false;
