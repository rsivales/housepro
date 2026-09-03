-- Personalização por-utilizador (Helix) — correr no SQL Editor do Supabase.
-- Guarda banner pessoal, widgets do dashboard, etc. num JSONB no perfil.
-- A RLS existente (profiles update self / public read) garante que cada
-- utilizador só altera as suas próprias preferências.

alter table profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;
