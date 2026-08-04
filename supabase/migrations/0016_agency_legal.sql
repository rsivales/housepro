-- HousePro — vínculo real do agente (usado no split do fecho) + dados legais
-- obrigatórios da agência de mediação. Depende de 0001.

-- Vínculo do agente: empresa própria VALIDADA dá o escalão "com empresa".
alter table profiles add column if not exists company_validated boolean not null default false;

-- Dados legais obrigatórios da agência de mediação (requisito legal).
alter table agencies
  add column if not exists ami_license    text,      -- nº de licença AMI
  add column if not exists ami_expires    date,       -- validade da AMI
  add column if not exists nipc           text,       -- NIPC (nº de pessoa coletiva)
  add column if not exists cae            text,       -- CAE (atividade)
  add column if not exists legal_email    text,       -- email de contacto legal/direção
  add column if not exists legal_docs     jsonb,       -- { tipo: url } dos comprovativos
  add column if not exists legal_complete boolean not null default false; -- gate operacional
