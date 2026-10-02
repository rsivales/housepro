-- CRÍTICO — colunas em falta em `properties` que estavam a bloquear TODAS as
-- gravações do formulário de imóvel (a app já enviava `plans` em cada
-- gravação; sem a coluna, a PostgREST rejeitava o pedido inteiro com "Could
-- not find the 'plans' column of 'properties' in the schema cache").
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  add column if not exists plans text[] default '{}';

-- Licença de utilização averbada na certidão predial permanente — dispensa
-- o upload em separado desse documento obrigatório.
alter table properties
  add column if not exists license_endorsed boolean default false;
