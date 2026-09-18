-- ─────────────────────────────────────────────────────────────────────────
-- Unifica a gestão de agências numa só fonte de verdade: a tabela real
-- `agencies` (a mesma que profiles.agency_id referencia).
--
-- Até aqui existiam DOIS sistemas de agência em paralelo e desligados um do
-- outro: (1) a tabela real `agencies` (ids UUID), usada para atribuir
-- consultores/agentes; e (2) uma lista em memória + site_settings (chave
-- "agencies", ids como "algarve") usada só para a página pública/"marca" —
-- com ids DIFERENTES. Resultado: a página pública de uma agência nunca via
-- os imóveis/equipa REAIS dessa agência, porque comparava o id errado.
--
-- Esta migração acrescenta à tabela real as colunas que faltavam para a
-- ficha pública completa (serviços, notícias/comunicados, mostrar/ocultar
-- vendidos/ativos/reservados, dados legais, descrição, fotos, prémios) —
-- tudo persistido a sério, numa única linha por agência, nunca em
-- localStorage nem só em site_settings.
-- ─────────────────────────────────────────────────────────────────────────

alter table agencies add column if not exists suspended     boolean not null default false;
alter table agencies add column if not exists services      text[]  not null default '{}';
alter table agencies add column if not exists show_active   boolean not null default true;
alter table agencies add column if not exists show_sold     boolean not null default true;
alter table agencies add column if not exists show_reserved boolean not null default true;
alter table agencies add column if not exists news          jsonb   not null default '[]'::jsonb;
alter table agencies add column if not exists description   text;
alter table agencies add column if not exists photos        text[]  not null default '{}';
alter table agencies add column if not exists prizes        jsonb   not null default '[]'::jsonb;
alter table agencies add column if not exists ami_license   text;
alter table agencies add column if not exists ami_expires   date;
alter table agencies add column if not exists nipc          text;
alter table agencies add column if not exists cae           text;
alter table agencies add column if not exists legal_email   text;
alter table agencies add column if not exists docs          jsonb   not null default '{}'::jsonb;

-- Renomeia a agência-semente do Algarve para "HousePro Prestige Algarve"
-- (mesma agência real, mesmos consultores/imóveis — só o nome/slug mudam).
update agencies set name = 'HousePro Prestige Algarve', slug = 'prestige-algarve'
  where slug = 'algarve' and name = 'HousePro Algarve';
