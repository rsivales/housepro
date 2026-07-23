-- HousePro — aprovação de publicação, tipo de vendedor e AMI próprio.
-- Depende de 0001.

-- Aprovação: imóvel oculto ao público até "aprovado".
alter table properties
  add column if not exists approval        text default 'pendente',   -- rascunho | pendente | aprovado | rejeitado
  add column if not exists submitted_at     timestamptz,
  add column if not exists approved_by      uuid references profiles (id),
  add column if not exists rejection_reason text,
  add column if not exists seller_type      text default 'particular'; -- particular | empresa

-- Consultor com AMI próprio (publica sem aprovação da marca).
alter table profiles
  add column if not exists own_ami boolean default false;

-- Só imóveis aprovados (ou de AMI próprio) são públicos. Substitui a política de
-- leitura pública para respeitar a aprovação.
drop policy if exists "properties public read" on properties;
create policy "properties public read" on properties for select
  using (
    (status <> 'rascunho' and approval = 'aprovado')
    or agent_id = auth.uid()
    or agency_id_of(agent_id) = auth_agency()
  );

-- Índice para a fila de aprovação.
create index if not exists properties_approval_idx on properties (approval);
