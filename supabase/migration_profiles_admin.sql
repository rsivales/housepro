-- Gestão de consultores no back office — correr no SQL Editor do Supabase.
-- Acrescenta os campos usados pela página /admin/consultores:
--   email  — mostrar/contactar o consultor
--   active — suspender/reativar (o login é bloqueado via ban no Auth)

alter table profiles
  add column if not exists email  text,
  add column if not exists active boolean not null default true;

create index if not exists profiles_email_idx on profiles (lower(email));
