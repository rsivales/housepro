-- Fatia 5a — Encargos, proprietário, etiquetas, flags e campos de empreendimento
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

alter table properties
  -- Encargos correntes (IMI, condomínio…): [{label, value, period}]
  add column if not exists expenses jsonb,
  -- Contactos do proprietário — PRIVADOS (nunca expostos ao público).
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists owner_email text,
  add column if not exists owner_nif text,
  -- Etiquetas (manuais + automáticas): array de texto.
  add column if not exists tags text[],
  -- Flags operacionais.
  add column if not exists has_placa boolean not null default false,
  add column if not exists has_keys boolean not null default false,
  -- Empreendimento: campos extra para exportação/portais.
  add column if not exists development_typologies text,
  add column if not exists development_price_from numeric,
  add column if not exists development_delivery text;
