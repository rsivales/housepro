-- #NN — Negócio: comprador ligado, comissão estimada e partilha com outra agência
-- Até agora "deals" só tinha buyer_name em texto livre, sem comissão nem
-- indicação de partilha com outra agência. Corre no Supabase (SQL Editor).
-- Seguro para correr mais do que uma vez.

alter table deals
  add column if not exists buyer_contact_id uuid references contacts (id) on delete set null,
  add column if not exists commission_type text not null default 'percent',
  add column if not exists commission_pct numeric(5,2),
  add column if not exists commission_fixed numeric(12,2),
  add column if not exists co_broker boolean not null default false,
  add column if not exists co_broker_agency_id uuid references agencies (id) on delete set null;

create index if not exists deals_buyer_contact_idx on deals (buyer_contact_id);
