-- Brochura autorizada por empreendimento/unidade. A URL é preenchida pela
-- equipa HousePro no backoffice; a montra nunca cria ou anuncia uma brochura
-- que não exista.
alter table public.properties
  add column if not exists development_brochure_url text;

comment on column public.properties.development_brochure_url is
  'URL pública da brochura autorizada do empreendimento (PDF ou página segura).';
