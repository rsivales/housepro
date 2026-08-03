-- HousePro — padrinhado (afilhados) + base para o override de rede.
-- Cada consultor tem no máximo UM padrinho direto (sponsor_id) — a árvore de
-- rede constrói-se a partir dessas ligações. `monthly_gross` guarda a comissão
-- bruta do mês (alimentada quando os negócios fecham) para calcular o override.
-- Depende de 0001 (profiles).

alter table profiles
  add column if not exists sponsor_id    uuid references profiles (id) on delete set null,
  add column if not exists monthly_gross numeric not null default 0;

create index if not exists profiles_sponsor_idx on profiles (sponsor_id);

-- Evita ciclos triviais (um consultor não pode ser padrinho de si próprio).
alter table profiles drop constraint if exists profiles_sponsor_not_self;
alter table profiles add constraint profiles_sponsor_not_self
  check (sponsor_id is null or sponsor_id <> id);
