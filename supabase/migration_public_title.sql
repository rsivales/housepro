-- #NN — Alias público do consultor
-- O próprio consultor pode escolher um "alias público" (ex.: "Consultor
-- imobiliário") mostrado no site em vez do papel interno do Helix (ex.:
-- "Administração"). Sem isto, a app cai sempre no rótulo automático.
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table profiles
  add column if not exists public_title text;

alter table profile_change_requests
  add column if not exists public_title text;
