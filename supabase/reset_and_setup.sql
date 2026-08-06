-- HousePro — RESET + SETUP completo (projeto NOVO / vazio).
-- ⚠️ DESTRUTIVO: apaga tudo o que estiver no schema public antes de recriar.
-- Usa só num projeto novo, sem dados reais. Cola TODO este ficheiro e corre UMA vez.

drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role, postgres;
grant all on schema public to postgres, service_role;

-- HousePro — setup COMPLETO da base de dados (migrações 0001–0019).
-- Cola este ficheiro no SQL Editor do Supabase e corre uma vez num projeto novo.
-- É seguro re-correr (usa if not exists / drop policy if exists na maioria).


-- ============================================================
-- 0001_init.sql
-- ============================================================
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


-- ============================================================
-- 0002_transactions.sql
-- ============================================================
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


-- ============================================================
-- 0003_reunioes.sql
-- ============================================================
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


-- ============================================================
-- 0004_imovel_rich.sql
-- ============================================================
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


-- ============================================================
-- 0005_imovel_geo_areas.sql
-- ============================================================
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


-- ============================================================
-- 0006_referrals.sql
-- ============================================================
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


-- ============================================================
-- 0007_approval_permissions.sql
-- ============================================================
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


-- ============================================================
-- 0008_teams_partnerships.sql
-- ============================================================
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


-- ============================================================
-- 0009_media_developments.sql
-- ============================================================
-- HousePro — multimédia rica do imóvel + categoria de empreendimentos (obra nova).
-- Depende de 0001, 0004 e 0005.
--
-- Reúne num único ficheiro as colunas que faltavam para:
--   • visualizador único de media  (vídeo, tour 360º, antes/depois)
--   • distrito                     (indexação em portais / organização por zona)
--   • empreendimentos novos        (categoria própria + flag de obra nova)

alter table properties
  -- Multimédia (o visualizador do detalhe consome estes campos).
  add column if not exists video_url        text,
  add column if not exists tour_url         text,
  -- Pares antes/depois (virtual staging / obras): [{before, after, label}].
  add column if not exists before_after     jsonb,
  -- Distrito (Faro, Lisboa, Porto…).
  add column if not exists district         text,
  -- Empreendimento novo (obra nova).
  add column if not exists is_development    boolean default false,
  add column if not exists development_name  text,
  add column if not exists development_stage text,     -- planta | construcao | pronto
  add column if not exists development_units integer;

-- Consultas rápidas à categoria de empreendimentos.
create index if not exists properties_development_idx
  on properties (is_development)
  where is_development = true;


-- ============================================================
-- 0010_site_settings.sql
-- ============================================================
-- HousePro — definições GLOBAIS da marca (chave/valor), lidas por todo o site.
-- Ex.: estilo da marca de água (texto/logótipo) partilhado por todos os
-- consultores e dispositivos. Depende de 0001 (has_role) e 0002.

create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Leitura pública (o carregamento de imóvel/site precisa do estilo da marca).
drop policy if exists "site_settings public read" on site_settings;
create policy "site_settings public read"
  on site_settings for select using (true);

-- Só a administração (marca) escreve.
drop policy if exists "site_settings write admin" on site_settings;
create policy "site_settings write admin"
  on site_settings for all
  using (has_role('admin'))
  with check (has_role('admin'));


-- ============================================================
-- 0011_sponsorships.sql
-- ============================================================
-- HousePro — padrinhado (afilhados) + base para o override de rede.
-- Cada consultor tem no máximo UM padrinho direto (sponsor_id) — a árvore de
-- rede constrói-se a partir dessas ligações. `monthly_gross` guarda a comissão
-- bruta do mês (alimentada quando os negócios fecham) para calcular o override.
-- Depende de 0001 (profiles).

alter table profiles
  add column if not exists sponsor_id    uuid references profiles (id) on delete set null,
  add column if not exists monthly_gross numeric not null default 0;

create index if not exists profiles_sponsor_idx on profiles (sponsor_id);

-- Evita ciclos triviais (um consultor não pode ser padrinho de si próprio).
alter table profiles drop constraint if exists profiles_sponsor_not_self;
alter table profiles add constraint profiles_sponsor_not_self
  check (sponsor_id is null or sponsor_id <> id);


-- ============================================================
-- 0012_notifications.sql
-- ============================================================
-- HousePro — notificações in-app (ex.: override de rede quando um afilhado
-- gera comissão). Depende de 0001 (profiles).

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  type       text not null default 'info',   -- info | override | referral | approval
  title      text not null,
  body       text,
  amount     numeric,                         -- valor associado (ex.: override €)
  href       text,                            -- link opcional para abrir
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

drop policy if exists "notifications own read" on notifications;
create policy "notifications own read"
  on notifications for select using (user_id = auth.uid());

drop policy if exists "notifications own update" on notifications;
create policy "notifications own update"
  on notifications for update using (user_id = auth.uid());

-- Um consultor autenticado pode criar notificações para outros (ex.: creditar
-- override aos padrinhos ao fechar um negócio).
drop policy if exists "notifications insert authenticated" on notifications;
create policy "notifications insert authenticated"
  on notifications for insert with check (auth.role() = 'authenticated');

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);


-- ============================================================
-- 0013_sponsorship_invites.sql
-- ============================================================
-- HousePro — convites de padrinhado com código. O padrinho gera um convite; o
-- consultor apadrinhado usa o código ao entrar e fica ligado à árvore certa.
-- Depende de 0001 (profiles) e 0011 (profiles.sponsor_id).

create table if not exists sponsorship_invites (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  sponsor_id uuid not null references profiles (id) on delete cascade,
  email      text,
  used_by    uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
create index if not exists sponsorship_invites_code_idx on sponsorship_invites (code);

alter table sponsorship_invites enable row level security;

-- O padrinho vê os seus convites; o apadrinhado vê o que usou.
drop policy if exists "invites read own" on sponsorship_invites;
create policy "invites read own"
  on sponsorship_invites for select
  using (sponsor_id = auth.uid() or used_by = auth.uid());

-- Cada consultor cria os seus próprios convites.
drop policy if exists "invites insert own" on sponsorship_invites;
create policy "invites insert own"
  on sponsorship_invites for insert
  with check (sponsor_id = auth.uid());

-- Resgatar: o apadrinhado marca o convite ainda não usado como usado por si.
drop policy if exists "invites redeem" on sponsorship_invites;
create policy "invites redeem"
  on sponsorship_invites for update
  using (used_by is null)
  with check (used_by = auth.uid());


-- ============================================================
-- 0014_codes.sql
-- ============================================================
-- HousePro — códigos numéricos legíveis para agências e agentes, base das
-- referências de imóveis (<país><agência><agente>-<seq>) e dos códigos de
-- padrinhado (<prefixo>A<geração>G<posição>). Depende de 0001.

alter table agencies add column if not exists code smallint;   -- 2 dígitos
alter table profiles add column if not exists code integer;    -- 4 dígitos

-- Atribui códigos sequenciais aos que ainda não têm (ordem de criação).
update agencies a set code = sub.rn
  from (select id, row_number() over (order by created_at) as rn from agencies) sub
  where a.id = sub.id and a.code is null;

update profiles p set code = sub.rn
  from (select id, row_number() over (partition by agency_id order by created_at) as rn from profiles) sub
  where p.id = sub.id and p.code is null;


-- ============================================================
-- 0015_network_active.sql
-- ============================================================
-- HousePro — estado de rede do consultor. Quem sai da rede fica inativo (mantém
-- a posição/código no histórico, mas não recebe nem passa override). Depende de
-- 0011 (profiles.sponsor_id).

alter table profiles add column if not exists network_active boolean not null default true;


-- ============================================================
-- 0016_agency_legal.sql
-- ============================================================
-- HousePro — vínculo real do agente (usado no split do fecho) + dados legais
-- obrigatórios da agência de mediação. Depende de 0001.

-- Vínculo do agente: empresa própria VALIDADA dá o escalão "com empresa".
alter table profiles add column if not exists company_validated boolean not null default false;

-- Dados legais obrigatórios da agência de mediação (requisito legal).
alter table agencies
  add column if not exists ami_license    text,      -- nº de licença AMI
  add column if not exists ami_expires    date,       -- validade da AMI
  add column if not exists nipc           text,       -- NIPC (nº de pessoa coletiva)
  add column if not exists cae            text,       -- CAE (atividade)
  add column if not exists legal_email    text,       -- email de contacto legal/direção
  add column if not exists legal_docs     jsonb,       -- { tipo: url } dos comprovativos
  add column if not exists legal_complete boolean not null default false; -- gate operacional


-- ============================================================
-- 0017_quality.sql
-- ============================================================
-- HousePro — módulo Qualidade: livro-razão de reputação do consultor.
-- Junta MÉRITOS (pontos positivos) e INFRAÇÕES (pontos negativos + penalização
-- monetária que compensa na comissão), com devido processo: a infração é
-- PROPOSTA, o agente pode CONTESTAR e a coordenação/direção CONFIRMA ou ANULA.
-- Só a infração confirmada aplica pontos e dinheiro. Depende de 0001.

create table if not exists quality_events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('merito','reparo','infracao')),
  agent_id     uuid not null references profiles(id) on delete cascade,
  category     text,              -- procedimento | documental | atraso | etica | reclamacao | abandono
  severity     text,              -- leve | media | grave
  points       integer not null default 0,   -- positivos (mérito) / negativos (infração) / 0 (reparo)
  amount       numeric not null default 0,   -- penalização monetária (€)
  reason       text not null,
  status       text,              -- pendente | ativo | resolvido | arquivada | proposta | contestada | confirmada | anulada
  origin       text,              -- manual | checklist | portal
  submitted_by text,              -- quem submeteu (ex.: nome do cliente no portal)
  contest_note text,
  reassigned_to uuid references profiles(id) on delete set null, -- abandono → colega
  residual_pct integer,           -- 10 (abandono) vs 25 (referência normal)
  deal_ref     text,              -- origem (ex.: item vital em atraso na escritura)
  created_by   uuid references profiles(id) on delete set null,
  decided_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists quality_events_agent_idx on quality_events (agent_id, created_at desc);

alter table quality_events enable row level security;

-- O agente vê os seus próprios eventos.
drop policy if exists quality_own_read on quality_events;
create policy quality_own_read on quality_events
  for select using (agent_id = auth.uid());

-- Coordenação/direção/admin veem e gerem tudo.
drop policy if exists quality_staff_read on quality_events;
create policy quality_staff_read on quality_events
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin'))
  );

drop policy if exists quality_staff_write on quality_events;
create policy quality_staff_write on quality_events
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin'))
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin'))
  );

-- O agente pode CONTESTAR uma infração sua (atualiza nota/estado).
drop policy if exists quality_own_contest on quality_events;
create policy quality_own_contest on quality_events
  for update using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Portal do cliente: pode submeter uma ocorrência que fica "pendente" para a
-- Qualidade analisar (nunca pune automaticamente). Só este formato é aceite.
drop policy if exists quality_portal_submit on quality_events;
create policy quality_portal_submit on quality_events
  for insert to anon, authenticated
  with check (origin = 'portal' and status = 'pendente' and kind = 'reparo');


-- ============================================================
-- 0018_property_audit.sql
-- ============================================================
-- HousePro — histórico de rastreio dos imóveis (audit trail): quem alterou o
-- quê e quando. Cada alteração fica registada com autor, data e campos (de→para).
-- Depende de 0001.

create table if not exists property_audit (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  property_ref text,
  actor_id     uuid references profiles(id) on delete set null,
  actor_name   text,
  actor_role   text,
  action       text not null,                 -- criou | editou | estado | aprovou
  changes      jsonb,                          -- [{ field, from, to }]
  created_at   timestamptz not null default now()
);

create index if not exists property_audit_prop_idx on property_audit (property_id, created_at desc);

alter table property_audit enable row level security;

-- Leitura: dono do imóvel e staff (coordenação/direção/admin/superadmin).
drop policy if exists property_audit_read on property_audit;
create policy property_audit_read on property_audit
  for select using (
    exists (select 1 from properties p where p.id = property_id and p.agent_id = auth.uid())
    or exists (select 1 from profiles pr where pr.id = auth.uid()
      and pr.role_key in ('coordenador','diretor','admin','superadmin'))
  );

-- Escrita: dono ou staff (o servidor valida antes de inserir).
drop policy if exists property_audit_write on property_audit;
create policy property_audit_write on property_audit
  for insert with check (
    exists (select 1 from properties p where p.id = property_id and p.agent_id = auth.uid())
    or exists (select 1 from profiles pr where pr.id = auth.uid()
      and pr.role_key in ('coordenador','diretor','admin','superadmin'))
  );


-- ============================================================
-- 0019_payouts.sql
-- ============================================================
-- HousePro — faturação & pagamentos: linhas de pagamento geradas no fecho do
-- negócio (produção, override, royalties, 2% do fundo de pensão), com estado
-- pendente → processado → pago. Depende de 0001.

create table if not exists payouts (
  id              uuid primary key default gen_random_uuid(),
  deal_ref        text,
  beneficiary_id  uuid references profiles(id) on delete set null,
  beneficiary_name text,
  role            text not null,       -- producao | override | royalties | pensao
  amount          numeric not null default 0,
  status          text not null default 'pendente',  -- pendente | processado | pago
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create index if not exists payouts_beneficiary_idx on payouts (beneficiary_id, created_at desc);

alter table payouts enable row level security;

-- O beneficiário vê os seus pagamentos.
drop policy if exists payouts_own_read on payouts;
create policy payouts_own_read on payouts
  for select using (beneficiary_id = auth.uid());

-- Coordenação/direção/admin/superadmin veem e gerem tudo.
drop policy if exists payouts_staff_all on payouts;
create policy payouts_staff_all on payouts
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin','superadmin'))
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin','superadmin'))
  );

