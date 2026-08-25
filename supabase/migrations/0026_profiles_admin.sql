-- 0026 — Gestão de consultores no back office
-- Acrescenta os campos que a UI de gestão de consultores precisa:
--   email  — para mostrar/contactar o consultor sem ir ao Auth
--   active — suspender/reativar sem apagar (o login também é bloqueado via ban)

alter table profiles
  add column if not exists email  text,
  add column if not exists active boolean not null default true;

-- Índice para procurar por email (criação/edição de consultores).
create index if not exists profiles_email_idx on profiles (lower(email));
