-- #NN — Negócio: comissão herdada do imóvel + partilha com outra agência
-- A comissão do negócio deixa de se repetir à mão (já está no imóvel) — só
-- falta indicar, quando há partilha, que fatia fica com a outra agência.
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table deals
  add column if not exists co_broker_split_type text not null default 'percent',
  add column if not exists co_broker_split_pct numeric(5,2),
  add column if not exists co_broker_split_fixed numeric(12,2);
