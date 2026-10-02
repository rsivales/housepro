-- Histórico de gestão de pessoas (consultores/papéis) — quem alterou o quê,
-- quando e a quem: papel, agência, suspender/reativar, padrinho, criação e
-- remoção. Espelha property_audit (0018), para o mesmo nível de confiança:
-- nada de "provisório" — toda a decisão de gestão de pessoas fica registada
-- permanentemente. Corre no Supabase (SQL Editor). Seguro para correr mais
-- do que uma vez.

create table if not exists people_audit (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid references profiles(id) on delete set null,
  target_name text,
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text,
  actor_role  text,
  action      text not null,   -- criou | editou | suspendeu | reativou | removeu
  changes     jsonb,           -- [{ field, from, to }]
  created_at  timestamptz not null default now()
);

create index if not exists people_audit_target_idx on people_audit (target_id, created_at desc);

alter table people_audit enable row level security;

-- Leitura reservada a coordenação e acima (a mesma fasquia da gestão de
-- pessoas). As escritas passam sempre por rotas de servidor com
-- service_role, já validadas pelo papel do requerente — não precisam de
-- policy de insert aqui.
drop policy if exists people_audit_read on people_audit;
create policy people_audit_read on people_audit
  for select using (
    exists (select 1 from profiles pr where pr.id = auth.uid()
      and pr.role_key in ('coordenador','diretor','admin','superadmin'))
  );
