-- Etiqueta de crédito da lead (aprovado/não aprovado/pendente) — para
-- identificar o estado do crédito de relance no cartão da lead, sem abrir.
alter table leads add column if not exists credit_status text
  check (credit_status in ('aprovado', 'nao_aprovado', 'pendente'));
