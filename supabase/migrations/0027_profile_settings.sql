-- 0027 — Personalização por-utilizador (Helix)
-- Guarda as preferências do consultor (banner pessoal, widgets do dashboard,
-- etc.) num único JSONB no perfil. A leitura/escrita é do próprio utilizador
-- (RLS "profiles update self" + "profiles public read" já existentes).

alter table profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;
