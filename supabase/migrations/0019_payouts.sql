-- HousePro — faturação & pagamentos: linhas de pagamento geradas no fecho do
-- negócio (produção, override, royalties, 2% do fundo de pensão), com estado
-- pendente → processado → pago. Depende de 0001.

create table if not exists payouts (
  id              uuid primary key default gen_random_uuid(),
  deal_ref        text,
  beneficiary_id  uuid references profiles(id) on delete set null,
  beneficiary_name text,
  role            text not null,       -- producao | override | royalties | pensao
  amount          numeric not null default 0,
  status          text not null default 'pendente',  -- pendente | processado | pago
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create index if not exists payouts_beneficiary_idx on payouts (beneficiary_id, created_at desc);

alter table payouts enable row level security;

-- O beneficiário vê os seus pagamentos.
drop policy if exists payouts_own_read on payouts;
create policy payouts_own_read on payouts
  for select using (beneficiary_id = auth.uid());

-- Coordenação/direção/admin/superadmin veem e gerem tudo.
drop policy if exists payouts_staff_all on payouts;
create policy payouts_staff_all on payouts
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin','superadmin'))
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid()
      and p.role_key in ('coordenador','diretor','admin','superadmin'))
  );
