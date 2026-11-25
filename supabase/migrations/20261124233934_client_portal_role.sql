-- Portal do cliente — um só papel escolhido no registo (comprador/vendedor/
-- investidor), em vez do menu com as três áreas. Aditivo.
begin;
alter table public.contacts
  add column if not exists portal_role text
    check (portal_role is null or portal_role in ('comprador','vendedor','investidor')),
  add column if not exists portal_onboarded_at timestamptz;
commit;
