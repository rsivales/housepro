-- HousePro / Helix — F3: X Call (chamadas assistidas).
--
-- Regista cada chamada: guião, objetivo, resultado, temperatura, notas, próximo
-- passo e (futuro) duração. Escreve também na cronologia do contacto (feito no
-- servidor). Preparado para telefonia sem ligar serviços pagos.
--
-- Aditiva e idempotente. Depende de 0001–0022. NÃO é aplicada automaticamente.

create table if not exists call_logs (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid references profiles (id) on delete set null,
  contact_id     uuid references contacts (id) on delete set null,
  lead_id        uuid references leads (id) on delete set null,
  script_key     text not null default 'comprador',
  objective      text,
  result         text not null,          -- atendeu|nao_atendeu|invalido|ligar_mais_tarde|qualificada|visita_marcada|sem_interesse|outro
  temperature    text,                   -- quente|morna|fria
  score          integer,
  notes          text,
  next_task_title text,
  next_task_due_at timestamptz,
  lost_reason    text,
  duration_sec   integer,
  created_at     timestamptz not null default now()
);
create index if not exists call_logs_agent_idx on call_logs (agent_id, created_at desc);
create index if not exists call_logs_contact_idx on call_logs (contact_id, created_at desc);

alter table call_logs enable row level security;

-- O próprio agente e o staff de gestão (helper de 0020).
drop policy if exists call_logs_scope on call_logs;
create policy call_logs_scope on call_logs
  for all using (agent_id = auth.uid() or is_meta_staff())
  with check (agent_id = auth.uid() or is_meta_staff());
