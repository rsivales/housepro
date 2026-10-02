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
