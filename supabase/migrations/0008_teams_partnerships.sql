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
