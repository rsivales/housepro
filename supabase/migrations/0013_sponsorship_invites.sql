-- HousePro — convites de padrinhado com código. O padrinho gera um convite; o
-- consultor apadrinhado usa o código ao entrar e fica ligado à árvore certa.
-- Depende de 0001 (profiles) e 0011 (profiles.sponsor_id).

create table if not exists sponsorship_invites (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  sponsor_id uuid not null references profiles (id) on delete cascade,
  email      text,
  used_by    uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
create index if not exists sponsorship_invites_code_idx on sponsorship_invites (code);

alter table sponsorship_invites enable row level security;

-- O padrinho vê os seus convites; o apadrinhado vê o que usou.
drop policy if exists "invites read own" on sponsorship_invites;
create policy "invites read own"
  on sponsorship_invites for select
  using (sponsor_id = auth.uid() or used_by = auth.uid());

-- Cada consultor cria os seus próprios convites.
drop policy if exists "invites insert own" on sponsorship_invites;
create policy "invites insert own"
  on sponsorship_invites for insert
  with check (sponsor_id = auth.uid());

-- Resgatar: o apadrinhado marca o convite ainda não usado como usado por si.
drop policy if exists "invites redeem" on sponsorship_invites;
create policy "invites redeem"
  on sponsorship_invites for update
  using (used_by is null)
  with check (used_by = auth.uid());
