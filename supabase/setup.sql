-- HousePro — configuração completa da base de dados (Supabase)
-- Cola este ficheiro INTEIRO no SQL Editor do Supabase e carrega em RUN.
-- Inclui, por ordem: todas as migrações + os dados de exemplo (seed).
-- Se algo falhar a meio, corre então os ficheiros um a um (0001..N e depois seed.sql).


-- ==========================================================
-- 0001_init.sql
-- ==========================================================
-- HousePro — Milestone 2 · esquema inicial
-- Postgres / Supabase. Multi-agência com RLS por agência.
-- Aplicar com a Supabase CLI:  supabase db push   (ou no SQL editor).

-- ─────────────────────────────────────────────────────────────
-- Extensões
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'coordenador', 'agente');
create type operation as enum ('venda', 'arrendamento');
create type property_status as enum ('rascunho', 'novo', 'destaque', 'reduzido', 'vendido');
create type lead_source as enum ('site', 'whatsapp', 'facebook', 'portal', 'consultor');

-- ─────────────────────────────────────────────────────────────
-- Agências
-- ─────────────────────────────────────────────────────────────
create table agencies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  region     text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Perfis (1:1 com auth.users) — consultores/coordenadores/admin
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  agency_id  uuid references agencies (id) on delete set null,
  role       user_role not null default 'agente',
  name       text not null,
  agency     text,
  whatsapp   text,
  photo_url  text,
  accent     text,
  created_at timestamptz not null default now()
);

-- Papel/agência do utilizador autenticado (helpers para RLS)
create or replace function auth_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_agency() returns uuid
  language sql stable security definer set search_path = public as $$
  select agency_id from profiles where id = auth.uid()
$$;

-- Agência de um dado consultor (usado nas policies por agência)
create or replace function agency_id_of(p_agent uuid) returns uuid
  language sql stable security definer set search_path = public as $$
  select agency_id from profiles where id = p_agent
$$;

-- ─────────────────────────────────────────────────────────────
-- Imóveis
-- ─────────────────────────────────────────────────────────────
create table properties (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,
  title        text not null,
  operation    operation not null,
  type         text not null,
  typology     text,
  price        numeric(12,2) not null,
  area         integer,
  beds         integer,
  baths        integer,
  parish       text,
  municipality text,
  energy       text,
  status       property_status not null default 'rascunho',
  cover_url    text,
  agent_id     uuid not null references profiles (id),  -- angariador
  interest     integer default 0,
  listed_at    date,
  sold_at      date,
  created_at   timestamptz not null default now()
);
create index properties_agent_idx on properties (agent_id);
create index properties_status_idx on properties (status);

create table property_media (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  url         text not null,
  kind        text not null default 'foto',   -- foto | video | planta | tour | antes | depois
  position    integer not null default 0
);
create index property_media_property_idx on property_media (property_id);

-- ─────────────────────────────────────────────────────────────
-- Leads — com atribuição ao consultor certo
-- ─────────────────────────────────────────────────────────────
create table leads (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete set null,
  -- owner_id = consultor que fica com o contacto. Se o cliente chegou via
  -- referrer (?ref), owner = referrer; caso contrário = angariador do imóvel.
  owner_id    uuid references profiles (id),
  referrer_id uuid references profiles (id),
  name        text not null,
  contact     text not null,
  message     text,
  source      lead_source not null default 'site',
  status      text not null default 'novo',
  created_at  timestamptz not null default now()
);
create index leads_owner_idx on leads (owner_id);

-- Resolve automaticamente o owner: referrer se existir, senão angariador.
create or replace function set_lead_owner() returns trigger
  language plpgsql as $$
begin
  if new.owner_id is null then
    new.owner_id := coalesce(
      new.referrer_id,
      (select agent_id from properties where id = new.property_id)
    );
  end if;
  return new;
end $$;

create trigger trg_set_lead_owner
  before insert on leads
  for each row execute function set_lead_owner();

-- ─────────────────────────────────────────────────────────────
-- Favoritos, pesquisas guardadas, notícias, configuração
-- ─────────────────────────────────────────────────────────────
create table favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  query      jsonb not null,
  alerts     boolean not null default true,
  created_at timestamptz not null default now()
);

create table news (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  title        text not null,
  excerpt      text,
  source       text,
  url          text,
  image_url    text,
  published_at timestamptz not null default now()
);

create table site_config (
  agency_id  uuid references agencies (id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  primary key (agency_id, key)
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table agencies      enable row level security;
alter table profiles      enable row level security;
alter table properties    enable row level security;
alter table property_media enable row level security;
alter table leads         enable row level security;
alter table favorites     enable row level security;
alter table saved_searches enable row level security;
alter table news          enable row level security;
alter table site_config   enable row level security;

-- Montra pública (leitura)
create policy "agencies public read"  on agencies      for select using (true);
create policy "profiles public read"   on profiles      for select using (true);
create policy "news public read"       on news          for select using (true);
create policy "config public read"     on site_config   for select using (true);
create policy "media public read"      on property_media for select using (true);
create policy "published properties read" on properties for select
  using (status <> 'rascunho' or agent_id = auth.uid() or agency_id_of(agent_id) = auth_agency());

-- Escrita de imóveis: angariador, ou coordenador/admin da mesma agência
create policy "properties insert own agency" on properties for insert
  with check (
    auth_role() in ('admin','coordenador','agente')
    and (agency_id_of(agent_id) = auth_agency() or auth_role() = 'admin')
  );
create policy "properties update own agency" on properties for update
  using (agent_id = auth.uid() or agency_id_of(agent_id) = auth_agency() or auth_role() = 'admin');

-- Perfis: próprio ou coordenador/admin da agência
create policy "profiles update self" on profiles for update
  using (id = auth.uid() or (auth_role() in ('coordenador','admin') and agency_id = auth_agency()));

-- Leads: qualquer visitante pode criar (site); ler só o dono ou coordenação da agência
create policy "leads insert public" on leads for insert with check (true);
create policy "leads read owner or coord" on leads for select
  using (
    owner_id = auth.uid()
    or (auth_role() in ('coordenador','admin')
        and agency_id_of(owner_id) = auth_agency())
  );

-- Favoritos / pesquisas: só o próprio
create policy "favorites own" on favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "searches own" on saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Configuração: escrita por coordenador/admin
create policy "config write coord" on site_config for all
  using (auth_role() in ('coordenador','admin') and (agency_id = auth_agency() or auth_role() = 'admin'))
  with check (auth_role() in ('coordenador','admin') and (agency_id = auth_agency() or auth_role() = 'admin'));

-- Notícias: escrita admin
create policy "news write admin" on news for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- Definições globais da marca (chave/valor) — ex.: marca de água
-- ─────────────────────────────────────────────────────────────
create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table site_settings enable row level security;
drop policy if exists "site_settings public read" on site_settings;
create policy "site_settings public read" on site_settings for select using (true);
drop policy if exists "site_settings write admin" on site_settings;
create policy "site_settings write admin" on site_settings for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- Storage (buckets públicos para leitura)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('property-media', 'property-media', true),
  ('agent-photos', 'agent-photos', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select
  using (bucket_id in ('property-media','agent-photos'));
create policy "media upload authenticated" on storage.objects for insert
  with check (bucket_id in ('property-media','agent-photos') and auth.role() = 'authenticated');

-- ==========================================================
-- 0002_transactions.sql
-- ==========================================================
-- HousePro — Milestone 2 · papéis múltiplos + transações (finalização)
-- Depende de 0001_init.sql.

-- ─────────────────────────────────────────────────────────────
-- Papéis múltiplos por utilizador
-- Um utilizador PODE acumular papéis (ex.: admin que também é coordenador).
-- `profiles.role` continua a ser o papel "principal"; `user_roles` é a
-- fonte de verdade para permissões.
-- ─────────────────────────────────────────────────────────────
create table user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role    user_role not null,
  primary key (user_id, role)
);
alter table user_roles enable row level security;
create policy "user_roles read" on user_roles for select using (true);

-- has_role: verdadeiro se o utilizador tem o papel pedido OU é admin
-- (o admin tem implicitamente os poderes de coordenador/agente).
create or replace function has_role(r user_role) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and (ur.role = r or ur.role = 'admin')
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- Estados do processo
-- ─────────────────────────────────────────────────────────────
-- Via transacional
create type deal_stage as enum (
  'proposta_enviada', 'proposta_aceite', 'reserva', 'cpcv', 'escritura',
  'concluido', 'cancelado'
);
-- Via crédito bancário (paralela)
create type credit_stage as enum (
  'sem_credito', 'pedido', 'aprovacao', 'avaliacao', 'escritura_marcada'
);
create type deal_doc_kind as enum (
  'identificacao', 'comprovativo_morada', 'mandato', 'cert_energetico',
  'caderneta', 'cpcv', 'comprovativo_reserva', 'aprovacao_credito',
  'avaliacao_banco', 'outro'
);

-- Percentagem concluída por etapa (reflexo nas áreas de cliente/agente)
create or replace function stage_percent(s deal_stage) returns int
  language sql immutable as $$
  select case s
    when 'proposta_enviada' then 10
    when 'proposta_aceite'  then 30
    when 'reserva'          then 50
    when 'cpcv'             then 75
    when 'escritura'        then 95
    when 'concluido'        then 100
    when 'cancelado'        then 0
  end
$$;

-- ─────────────────────────────────────────────────────────────
-- Transações (deals)
-- ─────────────────────────────────────────────────────────────
create table deals (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references properties (id) on delete set null,
  agency_id     uuid not null references agencies (id),  -- RLS por agência
  -- Clientes (podem ter conta no portal — ou apenas nome/contacto)
  buyer_user_id  uuid references auth.users (id),
  seller_user_id uuid references auth.users (id),
  buyer_name   text,
  seller_name  text,
  -- Equipa interna
  angariador_id           uuid references profiles (id),  -- angariou o imóvel
  consultor_comprador_id  uuid references profiles (id),  -- levou o comprador (referrer)
  coordenador_id          uuid references profiles (id),  -- responsável pela finalização
  -- Estado
  stage        deal_stage not null default 'proposta_enviada',
  credit_stage credit_stage not null default 'sem_credito',
  amount       numeric(12,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index deals_agency_idx on deals (agency_id);
create index deals_coordenador_idx on deals (coordenador_id);

-- Equipa de consultores envolvida (para além dos papéis fixos acima)
create table deal_participants (
  deal_id      uuid not null references deals (id) on delete cascade,
  profile_id   uuid not null references profiles (id) on delete cascade,
  role_in_deal text not null default 'consultor',  -- angariador|consultor_comprador|coordenador|consultor
  primary key (deal_id, profile_id)
);

create table deal_documents (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  kind        deal_doc_kind not null default 'outro',
  url         text not null,
  uploaded_by uuid references profiles (id),
  created_at  timestamptz not null default now()
);

-- Linha do tempo / auditoria das mudanças de etapa
create table deal_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals (id) on delete cascade,
  track      text not null default 'transacional',  -- transacional | credito
  from_stage text,
  to_stage   text not null,
  actor_id   uuid references profiles (id),
  note       text,
  created_at timestamptz not null default now()
);
create index deal_events_deal_idx on deal_events (deal_id);

-- ─────────────────────────────────────────────────────────────
-- Quem pode ver a transação? (participantes internos + clientes)
-- ─────────────────────────────────────────────────────────────
create or replace function can_view_deal(d deals) returns boolean
  language sql stable security definer set search_path = public as $$
  select
    d.buyer_user_id = auth.uid()
    or d.seller_user_id = auth.uid()
    or d.angariador_id = auth.uid()
    or d.consultor_comprador_id = auth.uid()
    or d.coordenador_id = auth.uid()
    or exists (select 1 from deal_participants dp
               where dp.deal_id = d.id and dp.profile_id = auth.uid())
    or (has_role('coordenador') and d.agency_id = auth_agency())
$$;

-- ─────────────────────────────────────────────────────────────
-- Finalização: só coordenador (ou admin) da agência avança as etapas.
-- Regista o evento e reflete a percentagem automaticamente.
-- ─────────────────────────────────────────────────────────────
create or replace function advance_deal(p_deal uuid, p_to deal_stage, p_note text default null)
  returns deals language plpgsql security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal;
  if not found then raise exception 'deal não encontrado'; end if;
  if not (has_role('coordenador') and d.agency_id = auth_agency()) then
    raise exception 'apenas a coordenação da agência pode finalizar transações';
  end if;

  insert into deal_events (deal_id, track, from_stage, to_stage, actor_id, note)
  values (p_deal, 'transacional', d.stage::text, p_to::text, auth.uid(), p_note);

  update deals set stage = p_to, updated_at = now() where id = p_deal returning * into d;
  return d;
end $$;

create or replace function advance_credit(p_deal uuid, p_to credit_stage, p_note text default null)
  returns deals language plpgsql security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal;
  if not found then raise exception 'deal não encontrado'; end if;
  if not (has_role('coordenador') and d.agency_id = auth_agency()) then
    raise exception 'apenas a coordenação da agência pode atualizar o crédito';
  end if;

  insert into deal_events (deal_id, track, from_stage, to_stage, actor_id, note)
  values (p_deal, 'credito', d.credit_stage::text, p_to::text, auth.uid(), p_note);

  update deals set credit_stage = p_to, updated_at = now() where id = p_deal returning * into d;
  return d;
end $$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table deals             enable row level security;
alter table deal_participants enable row level security;
alter table deal_documents    enable row level security;
alter table deal_events       enable row level security;

create policy "deals view participants"   on deals for select using (can_view_deal(deals));
create policy "deals insert coord"         on deals for insert
  with check (has_role('coordenador') and agency_id = auth_agency());
-- Nota: mudanças de etapa passam pelas funções advance_deal/advance_credit
-- (security definer). Update direto reservado à coordenação da agência.
create policy "deals update coord"         on deals for update
  using (has_role('coordenador') and agency_id = auth_agency());

create policy "deal_participants view" on deal_participants for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

create policy "deal_documents view" on deal_documents for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));
create policy "deal_documents upload" on deal_documents for insert
  with check (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

create policy "deal_events view" on deal_events for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

-- Bucket privado para documentos do processo
insert into storage.buckets (id, name, public) values ('deal-docs', 'deal-docs', false)
on conflict (id) do nothing;
create policy "deal docs read participants" on storage.objects for select
  using (bucket_id = 'deal-docs' and auth.role() = 'authenticated');
create policy "deal docs upload" on storage.objects for insert
  with check (bucket_id = 'deal-docs' and auth.role() = 'authenticated');

-- ==========================================================
-- 0003_reunioes.sql
-- ==========================================================
-- HousePro — Reunião Uau (apresentações personalizadas). Depende de 0001/0002.

create type reuniao_type as enum ('comprador', 'vendedor', 'investidor');
create type reuniao_status as enum ('rascunho', 'apresentada', 'concluida');

create table reunioes (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid references agencies (id),
  consultant_id  uuid not null references profiles (id),
  type           reuniao_type not null,
  status         reuniao_status not null default 'rascunho',
  client_name    text,
  client_contact text,
  property_ids   uuid[] not null default '{}',
  -- Dados do formulário e secções visíveis (o consultor escolhe o que aparece)
  data           jsonb not null default '{}',
  sections       jsonb not null default '{}',
  recommendation text,
  next_steps     text,
  -- Notas internas — NUNCA são incluídas na apresentação/PDF ao cliente.
  -- Protegidas por app (nunca selecionadas para render do cliente) e por RLS.
  internal_notes text,
  -- Resultado da reunião: { resultado, objecoes, interesse, proxima_acao }
  outcome        jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index reunioes_consultant_idx on reunioes (consultant_id);

alter table reunioes enable row level security;

-- O consultor gere as suas reuniões; a coordenação/admin da agência pode ver.
create policy "reunioes owner all" on reunioes for all
  using (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());

create policy "reunioes coord read" on reunioes for select
  using (has_role('coordenador') and agency_id = auth_agency());

-- ==========================================================
-- 0004_imovel_rich.sql
-- ==========================================================
-- HousePro — campos ricos do imóvel + documentos. Depende de 0001.

alter table properties
  add column if not exists short_description text,
  add column if not exists description      text,
  add column if not exists seo_title        text,
  add column if not exists seo_description   text,
  add column if not exists slug             text,
  add column if not exists keywords         text,
  add column if not exists construction_year int,
  add column if not exists elevator         boolean default false,
  add column if not exists ramp             boolean default false,
  add column if not exists parking          boolean default false,
  add column if not exists view             text,
  add column if not exists equipment        text[] default '{}',
  add column if not exists community         text,
  add column if not exists watermark        boolean default true;

create unique index if not exists properties_slug_idx on properties (slug);

-- Documentos do imóvel (caderneta, cert. energético, planta, …)
create table if not exists property_documents (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  kind        text not null default 'outro',
  url         text not null,
  -- Resultado da leitura/validação (OCR): campos extraídos e confirmação.
  validated   boolean not null default false,
  extracted   jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists property_documents_property_idx on property_documents (property_id);

alter table property_documents enable row level security;
create policy "property_documents view" on property_documents for select
  using (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  );
create policy "property_documents write" on property_documents for all
  using (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  )
  with check (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  );

-- Bucket privado para documentos do imóvel
insert into storage.buckets (id, name, public) values ('property-docs', 'property-docs', false)
on conflict (id) do nothing;

-- ==========================================================
-- 0005_imovel_geo_areas.sql
-- ==========================================================
-- HousePro — colunas em falta para a ficha rica do imóvel + geolocalização.
-- Depende de 0001 e 0004.

-- Novos estados públicos (etiquetas Oportunidade/Reservado).
alter type property_status add value if not exists 'oportunidade';
alter type property_status add value if not exists 'reservado';

alter table properties
  add column if not exists short_description text,
  add column if not exists area_util        numeric,
  add column if not exists area_dependente   numeric,
  add column if not exists land_area         numeric,
  add column if not exists garage            boolean default false,
  -- Galeria de imagens (para além da capa cover_url).
  add column if not exists gallery           text[]  default '{}',
  -- Coordenadas geocodificadas automaticamente a partir da morada.
  add column if not exists latitude          double precision,
  add column if not exists longitude         double precision,
  -- Comissão do imóvel (interno; visível a consultores, nunca ao público).
  add column if not exists commission_type   text default 'percent',  -- percent | fixed
  add column if not exists commission_pct    numeric,
  add column if not exists commission_fixed  numeric,
  -- Tipos de documento já carregados (para a nota de documentação em falta).
  add column if not exists document_kinds    text[] default '{}';

-- Índice geográfico simples (consultas por zona).
create index if not exists properties_geo_idx on properties (latitude, longitude);

-- ==========================================================
-- 0006_referrals.sql
-- ==========================================================
-- HousePro — referências (partilha de leads), em percentagem. Depende de 0001.

create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'consultor',      -- consultor | cliente
  property_id   uuid references properties (id) on delete set null,
  -- Origem/destino (consultor→consultor).
  from_id       uuid references profiles (id),
  to_id         uuid references profiles (id),
  -- Agência destino (cliente→agência da zona geográfica).
  agency_id     uuid references agencies (id),
  client_name   text not null,
  client_contact text not null,
  -- % que fica para quem referiu (mín. 25% consultor, 10% cliente).
  share_pct     numeric not null,
  proposed_by   text not null default 'origem',          -- origem | destino
  note          text,
  status        text not null default 'pendente',        -- pendente | contraproposta | ativa | rejeitada
  created_at    timestamptz not null default now()
);
create index if not exists referrals_to_idx on referrals (to_id);
create index if not exists referrals_from_idx on referrals (from_id);
create index if not exists referrals_agency_idx on referrals (agency_id);

alter table referrals enable row level security;

-- Inserção pública (formulário de cliente) e por consultores autenticados.
create policy "referrals insert public" on referrals for insert with check (true);

-- Leitura: partes envolvidas, ou coordenador/admin da agência envolvida.
create policy "referrals read involved" on referrals for select
  using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or has_role('admin')
    or (has_role('coordenador') and (
      agency_id = auth_agency()
      or agency_id_of(from_id) = auth_agency()
      or agency_id_of(to_id) = auth_agency()
    ))
  );

-- Atualização (aceitar/rejeitar/contrapor): partes envolvidas ou coordenador/admin.
create policy "referrals update involved" on referrals for update
  using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or has_role('admin')
    or (has_role('coordenador') and (
      agency_id = auth_agency()
      or agency_id_of(from_id) = auth_agency()
      or agency_id_of(to_id) = auth_agency()
    ))
  );

-- ==========================================================
-- 0007_approval_permissions.sql
-- ==========================================================
-- HousePro — aprovação de publicação, tipo de vendedor e AMI próprio.
-- Depende de 0001.

-- Aprovação: imóvel oculto ao público até "aprovado".
alter table properties
  add column if not exists approval        text default 'pendente',   -- rascunho | pendente | aprovado | rejeitado
  add column if not exists submitted_at     timestamptz,
  add column if not exists approved_by      uuid references profiles (id),
  add column if not exists rejection_reason text,
  add column if not exists seller_type      text default 'particular'; -- particular | empresa

-- Consultor com AMI próprio (publica sem aprovação da marca).
alter table profiles
  add column if not exists own_ami boolean default false;

-- Só imóveis aprovados (ou de AMI próprio) são públicos. Substitui a política de
-- leitura pública para respeitar a aprovação.
drop policy if exists "properties public read" on properties;
create policy "properties public read" on properties for select
  using (
    (status <> 'rascunho' and approval = 'aprovado')
    or agent_id = auth.uid()
    or agency_id_of(agent_id) = auth_agency()
  );

-- Índice para a fila de aprovação.
create index if not exists properties_approval_idx on properties (approval);

-- ==========================================================
-- 0008_teams_partnerships.sql
-- ==========================================================
-- HousePro — lacunas de esquema para o seed: papéis alargados, co-angariação,
-- leads partilhadas, equipas e parcerias. Depende de 0001–0007.

-- Papel preciso (o enum user_role não cobre diretor/agente_ami; usamos role_key).
alter table profiles
  add column if not exists role_key text default 'agente';   -- admin|diretor|coordenador|agente|agente_ami

-- Comissão: exceção autorizada + co-angariação.
alter table properties
  add column if not exists commission_justification text,
  add column if not exists commission_approved_by   text,
  add column if not exists co_agent_ids             uuid[] default '{}',   -- co-angariadores
  add column if not exists commission_split         jsonb;                 -- [{agent_id, pct}]

-- Leads: intenção, contactos e partilha em tempo real.
alter table leads
  add column if not exists intent       text default 'mensagem',  -- mensagem|visita|custos
  add column if not exists email        text,
  add column if not exists preferred_at timestamptz,
  add column if not exists co_owner_ids uuid[] default '{}',      -- co-donos (parceria)
  add column if not exists read_by      uuid[] default '{}',      -- quem já leu
  add column if not exists contacted_by uuid references profiles (id),
  add column if not exists contacted_at timestamptz;

-- Equipas (com team leader) e parcerias entre agentes.
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  agency_id  uuid references agencies (id) on delete cascade,
  leader_id  uuid not null references profiles (id),
  status     text not null default 'pendente',   -- pendente|aprovada|rejeitada
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id    uuid not null references teams (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  primary key (team_id, profile_id)
);

create table if not exists partnerships (
  id         uuid primary key default gen_random_uuid(),
  scope      text,
  status     text not null default 'pendente',   -- pendente|aprovada|rejeitada
  created_at timestamptz not null default now()
);

create table if not exists partnership_members (
  partnership_id uuid not null references partnerships (id) on delete cascade,
  profile_id     uuid not null references profiles (id) on delete cascade,
  primary key (partnership_id, profile_id)
);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table partnerships enable row level security;
alter table partnership_members enable row level security;

-- Leitura para autenticados (o detalhe fino fica para políticas por agência).
create policy "teams read" on teams for select using (auth.uid() is not null);
create policy "team_members read" on team_members for select using (auth.uid() is not null);
create policy "partnerships read" on partnerships for select using (auth.uid() is not null);
create policy "partnership_members read" on partnership_members for select using (auth.uid() is not null);

-- ==========================================================
-- seed.sql — dados de exemplo
-- ==========================================================
-- ============================================================================
-- HousePro — seed de demonstração (agências, consultores, imóveis, negócios,
-- leads, referências, equipas e parcerias). Espelha os dados mock da app.
--
-- Como correr:
--   • `supabase db reset`  → aplica migrações 0001–0008 e corre este seed; ou
--   • `psql "$DATABASE_URL" -f supabase/seed.sql`  (precisa de service role,
--      pois insere em auth.users e ignora RLS).
--
-- Credenciais demo: email <nome>@housepro.pt · password "housepro-demo".
-- Idempotente: usa `on conflict do nothing` / `truncate` das tabelas da app.
-- ============================================================================

begin;

-- Extensão para crypt()/gen_salt() (hash da password).
create extension if not exists pgcrypto;

-- ── auth.users (mínimo necessário) ──────────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
 ('b2222222-2222-4222-8222-222222222201','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ana@housepro.pt',    crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222202','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rui@housepro.pt',    crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222203','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sofia@housepro.pt',  crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222204','00000000-0000-0000-0000-000000000000','authenticated','authenticated','miguel@housepro.pt', crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222205','00000000-0000-0000-0000-000000000000','authenticated','authenticated','carla@housepro.pt',  crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}')
on conflict (id) do nothing;

-- ── Agências ────────────────────────────────────────────────────────────────
insert into agencies (id, name, slug, region) values
 ('a1111111-1111-4111-8111-111111111101','HousePro Lisboa','lisboa','Lisboa'),
 ('a1111111-1111-4111-8111-111111111102','HousePro Porto','porto','Porto'),
 ('a1111111-1111-4111-8111-111111111103','HousePro Cascais','cascais','Cascais'),
 ('a1111111-1111-4111-8111-111111111104','HousePro Braga','braga','Braga'),
 ('a1111111-1111-4111-8111-111111111105','HousePro Algarve','algarve','Algarve')
on conflict (id) do nothing;

-- ── Perfis (consultores) ────────────────────────────────────────────────────
-- role = enum base (admin|coordenador|agente); role_key = papel preciso.
insert into profiles (id, agency_id, role, role_key, own_ami, name, agency, whatsapp, photo_url, accent) values
 ('b2222222-2222-4222-8222-222222222201','a1111111-1111-4111-8111-111111111101','agente',     'agente',     false,'Ana Marques','HousePro Lisboa','351910000001','/agents/ana.jpg','var(--brand)'),
 ('b2222222-2222-4222-8222-222222222202','a1111111-1111-4111-8111-111111111102','agente',     'agente',     false,'Rui Tavares','HousePro Porto','351910000002','/agents/rui.jpg','var(--gold)'),
 ('b2222222-2222-4222-8222-222222222203','a1111111-1111-4111-8111-111111111103','coordenador','coordenador',false,'Sofia Nunes','HousePro Cascais','351910000003','/agents/sofia.jpg','oklch(0.55 0.09 230)'),
 ('b2222222-2222-4222-8222-222222222204','a1111111-1111-4111-8111-111111111104','agente',     'agente_ami', true, 'Miguel Costa','HousePro Braga','351910000004','/agents/miguel.jpg','oklch(0.62 0.12 40)'),
 ('b2222222-2222-4222-8222-222222222205','a1111111-1111-4111-8111-111111111105','coordenador','diretor',    false,'Carla Sousa','HousePro Algarve','351910000005','/agents/carla.jpg','oklch(0.6 0.11 250)')
on conflict (id) do nothing;

-- ── Imóveis ─────────────────────────────────────────────────────────────────
-- Limpa e reinsere (ordem: dependentes antes).
truncate table properties restart identity cascade;

insert into properties
 (id, reference, title, operation, type, typology, price, area, beds, baths, parish, municipality, energy, status, cover_url, gallery, agent_id, interest, listed_at, sold_at, short_description, description, area_util, area_dependente, land_area, garage, elevator, construction_year, latitude, longitude, commission_type, commission_pct, commission_fixed, commission_justification, commission_approved_by, document_kinds, seller_type, approval, submitted_at, co_agent_ids, commission_split)
values
('c3333333-3333-4333-8333-333333333301', 'HP-1042', 'Apartamento com terraço e vista rio', 'venda', 'Apartamento', 'T3', 685000, 138, 3, 2, 'Alcântara', 'Lisboa', 'A', 'destaque', '/properties/terracotta-dusk.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 84, '2026-07-12', null, null, null, null, null, null, null, null, null, null, null, 'percent', 5, null, null, null, '{cmi,doc_proprietario,caderneta,certidao_predial,cert_energetico,licenca_utilizacao,planta}', 'particular', 'aprovado', null, '{b2222222-2222-4222-8222-222222222202}', '[{"agent_id": "b2222222-2222-4222-8222-222222222201", "pct": 60}, {"agent_id": "b2222222-2222-4222-8222-222222222202", "pct": 40}]'::jsonb),
('c3333333-3333-4333-8333-333333333302', 'HP-1043', 'Moradia contemporânea com jardim e piscina', 'venda', 'Moradia', 'T4', 1250000, 320, 4, 4, 'Birre', 'Cascais', 'A+', 'novo', '/properties/sage-day.svg', '{}', 'b2222222-2222-4222-8222-222222222203', 71, '2026-07-18', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333303', 'HP-1044', 'Apartamento renovado no coração da Baixa', 'venda', 'Apartamento', 'T2', 420000, 92, 2, 1, 'Cedofeita', 'Porto', 'B', 'reduzido', '/properties/dusty-blue.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 90, '2026-07-05', null, null, null, null, null, null, null, null, null, null, null, 'percent', 4, null, null, null, '{caderneta,certidao_predial,cert_energetico,licenca_utilizacao,planta,ficha_tecnica,doc_proprietario}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333304', 'HP-1045', 'Moradia de traça clássica com quintal', 'venda', 'Moradia', 'T3', 560000, 210, 3, 2, 'São Vítor', 'Braga', 'C', 'reservado', '/properties/warm-sand.svg', '{}', 'b2222222-2222-4222-8222-222222222204', 52, '2026-06-20', null, null, null, null, null, null, null, null, null, null, null, 'fixed', null, 12000, null, null, '{caderneta,cert_energetico,planta}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333305', 'HP-1046', 'Penthouse com rooftop privado', 'venda', 'Apartamento', 'T4', 1690000, 245, 4, 3, 'Avenidas Novas', 'Lisboa', 'A', 'destaque', '/properties/twilight.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 80, '2026-07-16', null, null, null, null, null, null, null, null, null, null, null, 'percent', 4.5, null, null, null, '{caderneta,certidao_predial,cert_energetico,licenca_utilizacao}', 'empresa', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333306', 'HP-1047', 'Apartamento para arrendar com varanda', 'arrendamento', 'Apartamento', 'T1', 1350, 64, 1, 1, 'Bonfim', 'Porto', 'B-', 'novo', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 88, '2026-07-19', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333307', 'HP-1048', 'Moradia de luxo com vista mar e piscina', 'venda', 'Moradia', 'T5', 2950000, 540, 5, 5, 'Olhos de Água', 'Albufeira', 'A+', 'oportunidade', '/properties/villa-aerial.jpg', '{/properties/villa-aerial.jpg}', 'b2222222-2222-4222-8222-222222222205', 95, '2026-07-20', null, 'Moradia isolada de arquitetura contemporânea, a poucos minutos da praia de Olhos de Água, com piscina privativa, amplos terraços e vistas desafogadas sobre o mar.', 'Implantada num lote generoso e virada a sul, esta moradia T5 distribui-se por três pisos servidos por elevador. O piso social abre-se para uma sala com pé-direito duplo e envidraçados de correr que ligam ao terraço e à piscina de água salgada. A cozinha, totalmente equipada com eletrodomésticos de gama alta, comunica com uma zona de refeições exterior coberta. Os cinco quartos são todos suites, com roupeiros embutidos e casas de banho revestidas a materiais nobres. Completam o imóvel garagem para três viaturas, painéis solares, domótica e sistema de videovigilância. Uma oportunidade rara na zona premium do Algarve.', 420, 120, 1250, true, true, 2021, 37.0894, -8.1963, 'percent', 5, null, null, null, '{caderneta,certidao_predial,cert_energetico,planta}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333308', 'HP-1049', 'Moradia tradicional portuguesa com piscina', 'venda', 'Moradia', 'T3', 595000, 180, 3, 2, 'São Brás de Alportel', 'Faro', 'C', 'novo', '/properties/casapt-aerial.jpg', '{/properties/casapt-aerial.jpg,/properties/casapt-wc.jpg}', 'b2222222-2222-4222-8222-222222222205', 76, '2026-07-17', null, 'Casa tipicamente algarvia recuperada com bom gosto, com quintal, piscina e a tranquilidade do interior serrano a 20 minutos das praias de Faro.', 'Esta moradia térrea T3 preserva os traços da arquitetura tradicional algarvia — chaminé rendilhada, telha de canudo e platibandas — combinados com uma recuperação recente que trouxe conforto contemporâneo. Dispõe de sala com recuperador de calor, cozinha em plano aberto, três quartos amplos e dois quartos de banho. O logradouro, murado e ajardinado, integra uma piscina e uma zona de churrasco. Com garagem e arrecadação, é a escolha certa para quem procura autenticidade sem abdicar de acessos fáceis.', 150, 30, 640, true, false, 1998, 37.153, -7.888, 'percent', 5, null, null, null, '{caderneta,cert_energetico}', 'particular', 'pendente', '2026-07-22T07:40:00', '{}', null),
('c3333333-3333-4333-8333-333333333309', 'HP-1050', 'Estúdio para investimento no centro histórico', 'venda', 'Apartamento', 'T0', 82000, 38, 0, 1, 'Sé', 'Guarda', 'D', 'oportunidade', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 60, '2026-07-15', null, null, null, null, null, null, null, null, null, null, null, 'fixed', null, 3500, 'Cliente recorrente e angariação estratégica da carteira na Guarda.', 'Carla Sousa (coordenação)', '{caderneta}', 'particular', 'pendente', '2026-07-21T07:40:00', '{}', null),
('c3333333-3333-4333-8333-3333333333a1', 'HP-0990', 'Apartamento renovado junto ao rio', 'venda', 'Apartamento', 'T2', 465000, 98, 2, 2, 'Belém', 'Lisboa', 'B', 'vendido', '/properties/sage-day.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 0, '2026-05-02', '2026-07-10', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-3333333333a2', 'HP-0991', 'Moradia com jardim em zona calma', 'venda', 'Moradia', 'T4', 720000, 260, 4, 3, 'Aldoar', 'Porto', 'A', 'vendido', '/properties/warm-sand.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 0, '2026-04-18', '2026-06-28', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-3333333333a3', 'HP-0992', 'T3 com vista serra e garagem', 'venda', 'Apartamento', 'T3', 389000, 120, 3, 2, 'Nogueira', 'Braga', 'B-', 'vendido', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222204', 0, '2026-03-30', '2026-06-12', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null);

-- ── Negócios (deals) ────────────────────────────────────────────────────────
insert into deals (id, property_id, agency_id, buyer_name, seller_name,
                   angariador_id, consultor_comprador_id, coordenador_id,
                   stage, credit_stage, amount) values
 ('d4444444-4444-4444-8444-444444444401','c3333333-3333-4333-8333-333333333303','a1111111-1111-4111-8111-111111111102','João P.','Maria S.',
  'b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222203','cpcv','avaliacao',415000),
 ('d4444444-4444-4444-8444-444444444402','c3333333-3333-4333-8333-333333333307','a1111111-1111-4111-8111-111111111105','Família Oliveira','H. Santos',
  'b2222222-2222-4222-8222-222222222205','b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222205','proposta_aceite','sem_credito',2850000),
 ('d4444444-4444-4444-8444-444444444403','c3333333-3333-4333-8333-333333333305','a1111111-1111-4111-8111-111111111101','L. Ferreira','A. Nunes',
  'b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222203','escritura','escritura_marcada',1650000);

-- ── Leads (incl. lead partilhada por co-angariação) ─────────────────────────
insert into leads (id, property_id, owner_id, co_owner_ids, referrer_id, name,
                   contact, email, intent, message, preferred_at, source, status,
                   read_by, contacted_by, contacted_at, created_at) values
 ('e0000000-0000-4000-8000-0000000000a1','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','{}','b2222222-2222-4222-8222-222222222202','Marta Nogueira',
  '351962223344','marta.n@email.pt','visita','Gostaria de visitar ao fim de semana, se possível de manhã.','2026-07-26T10:30:00','site','novo','{}',null,null,'2026-07-21T18:12:00'),
 ('e0000000-0000-4000-8000-0000000000a2','c3333333-3333-4333-8333-333333333308','b2222222-2222-4222-8222-222222222202','{}',null,'João Pereira',
  '351911556677',null,'mensagem','O valor é negociável? Tenho crédito pré-aprovado.',null,'site','contactado','{}',null,null,'2026-07-20T09:40:00'),
 ('e0000000-0000-4000-8000-0000000000a3','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','{}',null,'Sofia Antunes',
  'sofia.antunes@email.pt','sofia.antunes@email.pt','mensagem','Existe possibilidade de estacionamento adicional?',null,'portal','agendado','{}',null,null,'2026-07-18T15:05:00'),
 -- lead de imóvel co-angariado (Ana dona, Rui co-dono) já contactada pela Ana
 ('e0000000-0000-4000-8000-0000000000a4','c3333333-3333-4333-8333-333333333301','b2222222-2222-4222-8222-222222222201','{b2222222-2222-4222-8222-222222222202}',null,'Tiago Freitas',
  '351963444555',null,'visita','Posso visitar na quinta à tarde?','2026-07-24T16:00:00','site','contactado',
  '{b2222222-2222-4222-8222-222222222201,b2222222-2222-4222-8222-222222222202}','b2222222-2222-4222-8222-222222222201','2026-07-22T10:15:00','2026-07-22T08:00:00');

-- ── Referências ─────────────────────────────────────────────────────────────
insert into referrals (id, type, property_id, from_id, to_id, agency_id,
                       client_name, client_contact, share_pct, proposed_by, note, status) values
 ('e5555555-5555-4555-8555-555555555501','consultor','c3333333-3333-4333-8333-333333333303','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222202',null,
  'Helena Dias','351962111222',25,'origem','Cliente conheci em Lisboa mas quer comprar no Porto.','pendente'),
 ('e5555555-5555-4555-8555-555555555502','consultor','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222205',null,
  'Family Oliveira','351915333444',30,'destino','Investidores, orçamento até 3M no Algarve.','ativa'),
 ('e5555555-5555-4555-8555-555555555503','consultor','c3333333-3333-4333-8333-333333333306','b2222222-2222-4222-8222-222222222204','b2222222-2222-4222-8222-222222222202',null,
  'Pedro Nunes','351919777888',35,'destino','Contraproposta enviada — aguardo o Miguel.','contraproposta'),
 ('e5555555-5555-4555-8555-555555555504','cliente',null,null,null,'a1111111-1111-4111-8111-111111111105',
  'Marta e Rui (amigos)','351968222333',10,'origem','Amigos a comprar casa de férias em Albufeira.','pendente');

-- ── Equipas (com team leader) ───────────────────────────────────────────────
insert into teams (id, name, agency_id, leader_id, status) values
 ('f6666666-6666-4666-8666-666666666601','Equipa Porto Centro','a1111111-1111-4111-8111-111111111102','b2222222-2222-4222-8222-222222222202','aprovada'),
 ('f6666666-6666-4666-8666-666666666602','Equipa Algarve Prime','a1111111-1111-4111-8111-111111111105','b2222222-2222-4222-8222-222222222205','pendente');
insert into team_members (team_id, profile_id) values
 ('f6666666-6666-4666-8666-666666666601','b2222222-2222-4222-8222-222222222202'),
 ('f6666666-6666-4666-8666-666666666602','b2222222-2222-4222-8222-222222222205');

-- ── Parcerias (ambos têm acesso à informação partilhada) ────────────────────
insert into partnerships (id, scope, status) values
 ('f7777777-7777-4777-8777-777777777701','Co-angariação Lisboa ↔ Porto','aprovada'),
 ('f7777777-7777-4777-8777-777777777702','Parceria Braga ↔ Algarve','pendente');
insert into partnership_members (partnership_id, profile_id) values
 ('f7777777-7777-4777-8777-777777777701','b2222222-2222-4222-8222-222222222201'),
 ('f7777777-7777-4777-8777-777777777701','b2222222-2222-4222-8222-222222222202'),
 ('f7777777-7777-4777-8777-777777777702','b2222222-2222-4222-8222-222222222204'),
 ('f7777777-7777-4777-8777-777777777702','b2222222-2222-4222-8222-222222222205');

commit;

-- Fim do seed. 5 agências · 5 consultores · 12 imóveis · 3 negócios · 4 leads
-- · 4 referências · 2 equipas · 2 parcerias.
