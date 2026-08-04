-- HousePro — módulo Qualidade: livro-razão de reputação do consultor.
-- Junta MÉRITOS (pontos positivos) e INFRAÇÕES (pontos negativos + penalização
-- monetária que compensa na comissão), com devido processo: a infração é
-- PROPOSTA, o agente pode CONTESTAR e a coordenação/direção CONFIRMA ou ANULA.
-- Só a infração confirmada aplica pontos e dinheiro. Depende de 0001.

create table if not exists quality_events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('merito','infracao')),
  agent_id     uuid not null references profiles(id) on delete cascade,
  category     text,              -- procedimento | documental | atraso | etica | reclamacao
  severity     text,              -- leve | media | grave
  points       integer not null default 0,   -- positivos (mérito) / negativos (infração)
  amount       numeric not null default 0,   -- penalização monetária (€)
  reason       text not null,
  status       text,              -- proposta | contestada | confirmada | anulada (só infrações)
  contest_note text,
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
