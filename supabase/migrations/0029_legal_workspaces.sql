-- 0029 — Workspace legal por processo (edições do advogado)
-- Guarda o estado editável do processo (secções do documento, checklist,
-- atividade, versão) por process_id. Só profissionais (utilizadores com perfil)
-- podem ler/escrever. Os processos em si continuam a nascer no fluxo próprio;
-- esta tabela guarda o trabalho sobre eles de forma persistente e partilhada.

create table if not exists legal_workspaces (
  process_id text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table legal_workspaces enable row level security;

-- Só utilizadores com perfil (equipa/advogados) acedem.
drop policy if exists "legal_workspaces staff read" on legal_workspaces;
create policy "legal_workspaces staff read" on legal_workspaces
  for select using (exists (select 1 from profiles p where p.id = auth.uid()));

drop policy if exists "legal_workspaces staff write" on legal_workspaces;
create policy "legal_workspaces staff write" on legal_workspaces
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = auth.uid()));

grant select, insert, update on legal_workspaces to authenticated;
