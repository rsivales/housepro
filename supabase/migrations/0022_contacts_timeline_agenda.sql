-- HousePro / Helix — F2: Contactos, cronologia única, tarefas e agenda.
--
-- `contacts` é a entidade central de pessoa. `contact_activities` é a CRONOLOGIA
-- ÚNICA e auditável. `tasks` e `visits` cobrem a agenda. A `leads` ganha
-- `contact_id` (nullable, retrocompatível) para se ligar a um contacto sem se
-- duplicar. RLS por dono/agência/staff, alinhada com os restantes módulos.
--
-- Aditiva e idempotente. Depende de 0001–0021. NÃO é aplicada automaticamente.

-- ── Contactos ──────────────────────────────────────────────────────────────
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  type       text not null default 'outro', -- comprador|vendedor|investidor|recrutamento|fornecedor|outro
  owner_id   uuid references profiles (id) on delete set null,
  agency_id  uuid references agencies (id) on delete set null,
  zone       text,
  budget     text,
  language   text,
  tags       text[] default '{}',
  source     text,
  consent    jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_owner_idx on contacts (owner_id);
create index if not exists contacts_agency_idx on contacts (agency_id);

-- Ligação lead → contacto (sem duplicar a lead).
alter table leads add column if not exists contact_id uuid references contacts (id) on delete set null;
create index if not exists leads_contact_idx on leads (contact_id);

-- ── Cronologia única ───────────────────────────────────────────────────────
create table if not exists contact_activities (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts (id) on delete cascade,
  type         text not null, -- lead|call|email|whatsapp|note|task|visit|stage|deal|document|system
  title        text not null,
  body         text,
  actor_id     uuid references profiles (id) on delete set null,
  actor_name   text,
  direction    text,          -- in | out
  lead_id      uuid references leads (id) on delete set null,
  deal_ref     text,
  property_ref text,
  created_at   timestamptz not null default now()
);
create index if not exists contact_activities_contact_idx on contact_activities (contact_id, created_at desc);

-- ── Tarefas ────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  title      text not null,
  kind       text not null default 'other', -- call|visit|followup|email|doc|other
  priority   text not null default 'normal',-- baixa|normal|alta
  due_at     timestamptz,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_owner_idx on tasks (owner_id, due_at);

-- ── Agenda (visitas/eventos) ─────────────────────────────────────────────────
create table if not exists visits (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references profiles (id) on delete cascade,
  contact_id   uuid references contacts (id) on delete set null,
  property_id  uuid references properties (id) on delete set null,
  property_ref text,
  kind         text not null default 'visita', -- visita|reuniao|avaliacao|outro
  at           timestamptz not null,
  duration_min integer,
  status       text not null default 'agendada', -- agendada|feita|cancelada|noshow
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists visits_owner_idx on visits (owner_id, at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table contacts           enable row level security;
alter table contact_activities enable row level security;
alter table tasks              enable row level security;
alter table visits             enable row level security;

-- Staff de gestão (reutiliza o helper criado em 0020).
-- Contactos: dono, mesma agência, ou staff.
drop policy if exists contacts_scope on contacts;
create policy contacts_scope on contacts
  for all using (
    owner_id = auth.uid()
    or is_meta_staff()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.agency_id = contacts.agency_id)
  ) with check (
    owner_id = auth.uid()
    or is_meta_staff()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.agency_id = contacts.agency_id)
  );

-- Cronologia: quem pode ver o contacto pode ver/escrever a cronologia.
drop policy if exists contact_activities_scope on contact_activities;
create policy contact_activities_scope on contact_activities
  for all using (
    is_meta_staff()
    or exists (select 1 from contacts c where c.id = contact_id
      and (c.owner_id = auth.uid()
        or exists (select 1 from profiles p where p.id = auth.uid() and p.agency_id = c.agency_id)))
  ) with check (
    is_meta_staff()
    or exists (select 1 from contacts c where c.id = contact_id
      and (c.owner_id = auth.uid()
        or exists (select 1 from profiles p where p.id = auth.uid() and p.agency_id = c.agency_id)))
  );

-- Tarefas e visitas: do dono, ou staff.
drop policy if exists tasks_scope on tasks;
create policy tasks_scope on tasks
  for all using (owner_id = auth.uid() or is_meta_staff())
  with check (owner_id = auth.uid() or is_meta_staff());

drop policy if exists visits_scope on visits;
create policy visits_scope on visits
  for all using (owner_id = auth.uid() or is_meta_staff())
  with check (owner_id = auth.uid() or is_meta_staff());
