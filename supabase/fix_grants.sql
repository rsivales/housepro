-- HousePro — CORREÇÃO de permissões ("permission denied for table …").
--
-- Causa: as tabelas foram criadas no SQL Editor (dono = postgres) mas o papel
-- `authenticated` (usado pela app após login) não recebeu privilégios de tabela.
-- A segurança por linha (RLS) já existe e continua a mandar — estes GRANTs só
-- dão o privilégio de tabela; as policies RLS é que decidem QUE linhas cada
-- utilizador vê/escreve.
--
-- SEGURO e não destrutivo. Cola TODO este ficheiro no Supabase → SQL Editor e
-- corre uma vez. Pode voltar a correr sem problema.

-- Acesso ao schema
grant usage on schema public to anon, authenticated;

-- Leitura pública (montra do site) — RLS limita às linhas publicadas
grant select on all tables in schema public to anon, authenticated;

-- Escrita apenas para utilizadores autenticados — RLS limita à sua agência
grant insert, update, delete on all tables in schema public to authenticated;

-- Sequências (ids/contadores)
grant usage, select on all sequences in schema public to anon, authenticated;

-- Tabelas/sequências criadas no FUTURO herdam os mesmos privilégios
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
