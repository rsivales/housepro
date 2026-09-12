-- Pipeline de LEADS no CRM (separado dos negócios).
-- Garante as colunas usadas pelo kanban de leads. Corre no Supabase (SQL
-- Editor). Seguro para correr mais do que uma vez.
-- (Se já correste o setup completo, estas colunas já existem.)

alter table leads
  add column if not exists pipeline text,
  add column if not exists stage integer default 0;
