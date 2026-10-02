-- Fatia 2 — Categorias e visibilidade do imóvel
-- Corre isto no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- Tipo de negócio detalhado (venda, permuta, trespasse, arrendamento ao ano,
  -- curta duração, timesharing, cedência de posição…). `operation` continua a
  -- ser a versão coarse (venda/arrendamento) usada nos filtros/portais.
  add column if not exists business_type text,
  -- Preço visível ao público (auto-oculto quando vendido).
  add column if not exists price_visible boolean not null default true,
  -- Privacidade da morada no mapa público: exact | approx | locality | hidden.
  add column if not exists location_privacy text not null default 'approx';

-- Preenche o tipo de negócio nos imóveis já existentes a partir da operação.
-- operation é um enum — converte para texto ao copiar para business_type.
update properties
  set business_type = coalesce(business_type, operation::text)
  where business_type is null;
