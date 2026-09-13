-- Persistência real dos documentos do imóvel (antes só se guardava o TIPO —
-- document_kinds — nunca o ficheiro/URL em si; ao sair da página, os
-- documentos carregados desapareciam). Corre no Supabase (SQL Editor).
-- Seguro para correr mais do que uma vez.

alter table properties
  add column if not exists documents_meta jsonb;
