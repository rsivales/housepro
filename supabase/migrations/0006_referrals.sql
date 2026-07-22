-- HousePro — referências (partilha de leads), em percentagem. Depende de 0001.

create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'consultor',      -- consultor | cliente
  property_id   uuid references properties (id) on delete set null,
  -- Origem/destino (consultor→consultor).
  from_id       uuid references profiles (id),
  to_id         uuid references profiles (id),
  -- Agência destino (cliente→agência da zona geográfica).
  agency_id     uuid references agencies (id),
  client_name   text not null,
  client_contact text not null,
  -- % que fica para quem referiu (mín. 25% consultor, 10% cliente).
  share_pct     numeric not null,
  proposed_by   text not null default 'origem',          -- origem | destino
  note          text,
  status        text not null default 'pendente',        -- pendente | contraproposta | ativa | rejeitada
  created_at    timestamptz not null default now()
);
create index if not exists referrals_to_idx on referrals (to_id);
create index if not exists referrals_from_idx on referrals (from_id);
create index if not exists referrals_agency_idx on referrals (agency_id);

alter table referrals enable row level security;

-- Inserção pública (formulário de cliente) e por consultores autenticados.
create policy "referrals insert public" on referrals for insert with check (true);

-- Leitura: partes envolvidas, ou coordenador/admin da agência envolvida.
create policy "referrals read involved" on referrals for select
  using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or has_role('admin')
    or (has_role('coordenador') and (
      agency_id = auth_agency()
      or agency_id_of(from_id) = auth_agency()
      or agency_id_of(to_id) = auth_agency()
    ))
  );

-- Atualização (aceitar/rejeitar/contrapor): partes envolvidas ou coordenador/admin.
create policy "referrals update involved" on referrals for update
  using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or has_role('admin')
    or (has_role('coordenador') and (
      agency_id = auth_agency()
      or agency_id_of(from_id) = auth_agency()
      or agency_id_of(to_id) = auth_agency()
    ))
  );
