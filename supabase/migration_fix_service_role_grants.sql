-- CRÍTICO — corrige "permission denied for table X" ao gravar através das
-- rotas de servidor com service_role (ex.: /api/admin/consultores). Este
-- projeto já passou por pelo menos um reset completo do esquema
-- (setup.sql / setup_full.sql / reset_and_setup.sql) — é provável que as
-- concessões (grants) para service_role nunca tenham sido reatribuídas
-- depois disso, deixando algumas (ou todas) as tabelas sem acesso de
-- escrita mesmo para a conta de serviço, que deveria poder escrever em
-- qualquer tabela (ignora RLS, mas continua a precisar de GRANT).
--
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Garante que qualquer tabela criada no futuro herda automaticamente o
-- acesso, para não se repetir este problema tabela a tabela.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
