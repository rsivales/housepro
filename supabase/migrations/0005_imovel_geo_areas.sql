-- HousePro — colunas em falta para a ficha rica do imóvel + geolocalização.
-- Depende de 0001 e 0004.

-- Novos estados públicos (etiquetas Oportunidade/Reservado).
alter type property_status add value if not exists 'oportunidade';
alter type property_status add value if not exists 'reservado';

alter table properties
  add column if not exists short_description text,
  add column if not exists area_util        numeric,
  add column if not exists area_dependente   numeric,
  add column if not exists land_area         numeric,
  add column if not exists garage            boolean default false,
  -- Galeria de imagens (para além da capa cover_url).
  add column if not exists gallery           text[]  default '{}',
  -- Coordenadas geocodificadas automaticamente a partir da morada.
  add column if not exists latitude          double precision,
  add column if not exists longitude         double precision,
  -- Comissão do imóvel em % (interno; visível a consultores, nunca ao público).
  add column if not exists commission_pct    numeric;

-- Índice geográfico simples (consultas por zona).
create index if not exists properties_geo_idx on properties (latitude, longitude);
