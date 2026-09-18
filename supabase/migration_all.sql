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

-- ── migration_property_location_fields.sql ───────────────────────────────
-- Vista, equipamentos, notas da comunidade, rampa/acessível — tinham UI no
-- formulário mas nunca foram gravados (colunas nunca criadas).
alter table properties
  add column if not exists view_type          text,
  add column if not exists amenities          text[] default '{}',
  add column if not exists neighborhood_notes text,
  add column if not exists accessible         boolean default false;

-- ── migration_fix_service_role_grants.sql ────────────────────────────────
-- CRÍTICO — "permission denied for table X" via service_role: faltavam
-- GRANTs (provavelmente perdidos num reset de esquema anterior).
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- ── migration_backfill_agent_codes.sql (dados, idempotente) ─────────────
-- Atribui código sequencial a consultores criados sem código (a rota de
-- criação não o atribuía antes; já corrigido). Nunca colide com códigos
-- existentes.
with maxcode as (
  select agency_id, coalesce(max(code), 0) as base
  from profiles
  where agency_id is not null
  group by agency_id
),
ranked as (
  select p.id, p.agency_id,
         row_number() over (partition by p.agency_id order by p.created_at) as rn
  from profiles p
  where p.code is null and p.agency_id is not null
)
update profiles p
set code = maxcode.base + ranked.rn
from ranked
join maxcode on maxcode.agency_id = ranked.agency_id
where p.id = ranked.id;

-- ── migration_people_audit.sql ───────────────────────────────────────────
-- Histórico de gestão de pessoas (papel, agência, suspender/reativar,
-- padrinho, criação/remoção) — nada fica "provisório".
create table if not exists people_audit (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid references profiles(id) on delete set null,
  target_name text,
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text,
  actor_role  text,
  action      text not null,
  changes     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists people_audit_target_idx on people_audit (target_id, created_at desc);
alter table people_audit enable row level security;
drop policy if exists people_audit_read on people_audit;
create policy people_audit_read on people_audit
  for select using (
    exists (select 1 from profiles pr where pr.id = auth.uid()
      and pr.role_key in ('coordenador','diretor','admin','superadmin'))
  );

-- ── migration_fix_properties_read_policy.sql ─────────────────────────────
-- CRÍTICO — duas políticas de SELECT em properties com nomes diferentes
-- coexistiam (RLS combina com OR); corrige para uma só, clara: só "fora de
-- mercado" bloqueia a partilha por link direto — pendente de
-- aprovação/documentos continua acessível a quem tem o link.
drop policy if exists "published properties read" on properties;
drop policy if exists "properties public read" on properties;
create policy "properties public read" on properties for select
  using (
    off_market = false
    or agent_id = auth.uid()
    or agency_id_of(agent_id) = auth_agency()
  );
-- ─────────────────────────────────────────────────────────────────────────
-- Unifica a gestão de agências numa só fonte de verdade: a tabela real
-- `agencies` (a mesma que profiles.agency_id referencia).
--
-- Até aqui existiam DOIS sistemas de agência em paralelo e desligados um do
-- outro: (1) a tabela real `agencies` (ids UUID), usada para atribuir
-- consultores/agentes; e (2) uma lista em memória + site_settings (chave
-- "agencies", ids como "algarve") usada só para a página pública/"marca" —
-- com ids DIFERENTES. Resultado: a página pública de uma agência nunca via
-- os imóveis/equipa REAIS dessa agência, porque comparava o id errado.
--
-- Esta migração acrescenta à tabela real as colunas que faltavam para a
-- ficha pública completa (serviços, notícias/comunicados, mostrar/ocultar
-- vendidos/ativos/reservados, dados legais, descrição, fotos, prémios) —
-- tudo persistido a sério, numa única linha por agência, nunca em
-- localStorage nem só em site_settings.
-- ─────────────────────────────────────────────────────────────────────────

alter table agencies add column if not exists suspended     boolean not null default false;
alter table agencies add column if not exists services      text[]  not null default '{}';
alter table agencies add column if not exists show_active   boolean not null default true;
alter table agencies add column if not exists show_sold     boolean not null default true;
alter table agencies add column if not exists show_reserved boolean not null default true;
alter table agencies add column if not exists news          jsonb   not null default '[]'::jsonb;
alter table agencies add column if not exists description   text;
alter table agencies add column if not exists photos        text[]  not null default '{}';
alter table agencies add column if not exists prizes        jsonb   not null default '[]'::jsonb;
alter table agencies add column if not exists ami_license   text;
alter table agencies add column if not exists ami_expires   date;
alter table agencies add column if not exists nipc          text;
alter table agencies add column if not exists cae           text;
alter table agencies add column if not exists legal_email   text;
alter table agencies add column if not exists docs          jsonb   not null default '{}'::jsonb;

-- Renomeia a agência-semente do Algarve para "HousePro Prestige Algarve"
-- (mesma agência real, mesmos consultores/imóveis — só o nome/slug mudam).
update agencies set name = 'HousePro Prestige Algarve', slug = 'prestige-algarve'
  where slug = 'algarve' and name = 'HousePro Algarve';
-- ─────────────────────────────────────────────────────────────────────────
-- Referência de imóvel gerada automaticamente, nunca à mão e nunca
-- duplicada: HP<agência><agente 3 díg.>-<sequência 2 díg.> — ex.: "HP1001-01"
-- é o 1.º imóvel do agente nº 1 da agência nº 1.
--
-- Até aqui a referência era um campo de texto livre no formulário — o
-- consultor escrevia-a à mão (sujeito a erro/duplicação) e o servidor só a
-- gerava como reserva se o campo viesse vazio, contando linhas existentes
-- (o que reatribui o mesmo número se um imóvel for apagado). Passa a ser
-- SEMPRE gerada no servidor, com um contador monótono (nunca reutilizado,
-- mesmo que um imóvel seja apagado) e atómico (sem condição de corrida entre
-- duas angariações em simultâneo).
-- ─────────────────────────────────────────────────────────────────────────

-- Próximo número de agente (3 dígitos) a atribuir dentro de cada agência.
alter table agencies add column if not exists next_agent_code int not null default 1;
-- Arranca a seguir ao maior código de agente já atribuído nessa agência.
update agencies a set next_agent_code = coalesce((select max(p.code) from profiles p where p.agency_id = a.id), 0) + 1;

-- Próximo número de imóvel (2 dígitos) a atribuir a cada agente.
alter table profiles add column if not exists next_property_seq int not null default 1;
-- Arranca a seguir à contagem de imóveis já angariados por esse agente.
update profiles p set next_property_seq = coalesce((select count(*) from properties pr where pr.agent_id = p.id), 0) + 1;

-- Referência antiga, de outra agência/plataforma, para imóveis migrados —
-- mantém o rasto à origem do processo sem quebrar a coerência da nova
-- numeração (nunca aparece ao público).
alter table properties add column if not exists legacy_reference text;

-- Atribui e incrementa atomicamente — chamado uma vez por criação de
-- consultor/imóvel; nunca reutiliza um número, mesmo sob concorrência.
create or replace function next_agent_code(p_agency uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update agencies set next_agent_code = next_agent_code + 1
    where id = p_agency
    returning next_agent_code - 1 into v;
  return v;
end;
$$;

create or replace function next_property_seq(p_agent uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update profiles set next_property_seq = next_property_seq + 1
    where id = p_agent
    returning next_property_seq - 1 into v;
  return v;
end;
$$;
