-- Atribuição direta de uma lead a uma lista de email guardada (triagem e
-- acompanhamento) — independente da correspondência por segmento/contacto.
alter table leads add column if not exists email_list_id uuid references email_lists (id) on delete set null;

create index if not exists leads_email_list_id_idx on leads (email_list_id) where email_list_id is not null;
