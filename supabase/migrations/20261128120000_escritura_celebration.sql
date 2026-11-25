-- Email de parabéns ao comprador no dia da escritura (uma vez por negócio).
alter table public.deals add column if not exists escritura_celebrated_at timestamptz;
