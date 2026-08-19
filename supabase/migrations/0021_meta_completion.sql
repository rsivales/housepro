-- HousePro / Helix — conclusão do módulo Meta (F1).
--
-- Amplia `leads` (idempotência de webhooks + idioma/especialidade + oferta a
-- conjunto) e `assignment_rules` (estratégias e configuração em falta:
-- rotação ponderada, orçamento/idioma/especialidade, substituto, fallback,
-- limite diário, prazo de aceitação, gestor a avisar).
--
-- Aditiva e idempotente. Depende de 0020_meta_crm.sql. NÃO é aplicada
-- automaticamente — corre no SQL editor quando quiseres passar à BD.

-- ── leads ──────────────────────────────────────────────────────────────
alter table leads
  add column if not exists external_id text,           -- leadgen_id do Meta (dedup)
  add column if not exists language    text,
  add column if not exists specialty   text,
  add column if not exists offered_to  uuid[] default '{}'; -- "primeiro a aceitar"

-- Idempotência: a mesma lead do Meta nunca entra duas vezes.
create unique index if not exists leads_external_id_uidx
  on leads (external_id) where external_id is not null;

-- ── assignment_rules ───────────────────────────────────────────────────
alter table assignment_rules
  add column if not exists weights             jsonb,   -- { agentId: peso }
  add column if not exists budget_map          jsonb,   -- { escalão: destino }
  add column if not exists language_map        jsonb,
  add column if not exists specialty_map       jsonb,
  add column if not exists substitute_id       uuid references profiles (id) on delete set null,
  add column if not exists fallback_id         uuid references profiles (id) on delete set null,
  add column if not exists daily_limit         integer,
  add column if not exists acceptance_deadline_h integer,
  add column if not exists notify_manager_id   uuid references profiles (id) on delete set null;
