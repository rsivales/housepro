-- Fatia 3 — Ordenação da galeria + divisão por fotografia
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.
-- A ORDEM das fotos já é dada pela ordem do array `gallery` (a 1.ª = capa);
-- esta coluna guarda a divisão/etiqueta de cada foto, alinhada por URL.

alter table properties
  add column if not exists gallery_meta jsonb;
