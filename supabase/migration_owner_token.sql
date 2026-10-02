-- Portal do proprietário — link só de leitura para o dono acompanhar o imóvel
-- (estado, visitas, interessados, reserva/CPCV/escritura).
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  add column if not exists owner_token text;

-- Token único e indexado (para a página pública /proprietario/[token]).
create unique index if not exists properties_owner_token_idx
  on properties (owner_token) where owner_token is not null;
