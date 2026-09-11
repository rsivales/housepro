-- Fatia 4 — Contrato de mediação (CMI) e validades
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- CMI exclusivo (true) ou aberto (false). Aberto oculta a morada pública.
  add column if not exists cmi_exclusive boolean not null default true,
  -- Renovação automática do CMI.
  add column if not exists cmi_renewable boolean not null default false,
  -- Início do CMI e duração (meses) — validade = início + meses.
  add column if not exists cmi_start date,
  add column if not exists cmi_months integer,
  -- Validade do certificado energético — alerta de expiração.
  add column if not exists energy_cert_expiry date;
