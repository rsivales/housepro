-- #NN — Portal do comprador (link privado, só leitura)
-- Mesmo mecanismo já usado no portal do proprietário (token aleatório,
-- sem login): o comprador vê a evolução do negócio em que está ligado como
-- buyer_contact_id. Corre no Supabase (SQL Editor). Seguro repetir.

alter table contacts
  add column if not exists portal_token text unique;
