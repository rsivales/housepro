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
