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
