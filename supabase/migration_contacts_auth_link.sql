-- Liga a conta de cliente (login por magic link em /cliente/entrar) ao
-- contacto no CRM, para o comprador ter a sua página e histórico (favoritos)
-- salvaguardados desde o primeiro acesso, antes de qualquer negócio existir.
-- Quando um consultor liga esse mesmo e-mail a um negócio, fica tudo
-- automaticamente ligado. Corre no Supabase (SQL Editor). Seguro repetir.

alter table contacts
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists contacts_auth_user_id_key on contacts (auth_user_id) where auth_user_id is not null;
