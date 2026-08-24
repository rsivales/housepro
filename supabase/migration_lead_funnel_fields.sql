-- HousePro — colunas dos funis públicos (avaliação + calculadora de mais-valias)
-- na tabela leads, para os metadados persistirem. Não destrutivo.
-- NOTA: requer também a atualização do insert em src/lib/db/repo.ts (createLead)
-- para escrever estas colunas — peço para o fazer quando quiseres.

alter table leads
  add column if not exists sub_source          text,
  add column if not exists page_url            text,
  add column if not exists referrer_url        text,
  add column if not exists utm                 jsonb,
  add column if not exists form_version        text,
  add column if not exists property_type       text,
  add column if not exists property_condition  text,
  add column if not exists evaluation_reason   text,
  add column if not exists sell_timeframe      text,
  add column if not exists contact_preference  text,
  add column if not exists best_time           text,
  add column if not exists marketing_consent   boolean default false,
  add column if not exists email_status        text,
  add column if not exists fiscal_year         integer;
