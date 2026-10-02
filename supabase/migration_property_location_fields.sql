-- Campos de "Localização & características" que tinham UI no formulário mas
-- nunca chegaram a ser gravados: nenhuma coluna existia (vista, equipamentos,
-- notas da comunidade, rampa/acessível), e "estacionamento" duplicava sem
-- ligação a `garage`, que já existe e é a coluna usada na página pública.
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  add column if not exists view_type          text,
  add column if not exists amenities          text[] default '{}',
  add column if not exists neighborhood_notes text,
  add column if not exists accessible         boolean default false;
