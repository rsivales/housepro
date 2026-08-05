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
