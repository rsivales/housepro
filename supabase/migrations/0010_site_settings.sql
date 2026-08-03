-- HousePro — definições GLOBAIS da marca (chave/valor), lidas por todo o site.
-- Ex.: estilo da marca de água (texto/logótipo) partilhado por todos os
-- consultores e dispositivos. Depende de 0001 (has_role) e 0002.

create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Leitura pública (o carregamento de imóvel/site precisa do estilo da marca).
drop policy if exists "site_settings public read" on site_settings;
create policy "site_settings public read"
  on site_settings for select using (true);

-- Só a administração (marca) escreve.
drop policy if exists "site_settings write admin" on site_settings;
create policy "site_settings write admin"
  on site_settings for all
  using (has_role('admin'))
  with check (has_role('admin'));
