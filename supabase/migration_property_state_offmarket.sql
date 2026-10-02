-- Fatia 5b — Estado (activo/pendente/inactivo) + fora de mercado
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.
-- Só "activo" e NÃO fora-de-mercado aparecem ao público/portais; os restantes
-- ficam visíveis apenas à agência (internamente).

alter table properties
  add column if not exists listing_state text not null default 'activo',
  add column if not exists off_market boolean not null default false;
