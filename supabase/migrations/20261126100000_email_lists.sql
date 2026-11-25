-- X Campaigns: listas de email guardadas (audiências reutilizáveis) — um
-- segmento com nome, para não reconfigurar os critérios em cada campanha.
create table if not exists email_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  segment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_lists_owner_id_idx on email_lists (owner_id);

alter table email_lists enable row level security;

drop policy if exists "email lists select own" on email_lists;
create policy "email lists select own" on email_lists
  for select using (owner_id = auth.uid());

drop policy if exists "email lists insert own" on email_lists;
create policy "email lists insert own" on email_lists
  for insert with check (owner_id = auth.uid());

drop policy if exists "email lists delete own" on email_lists;
create policy "email lists delete own" on email_lists
  for delete using (owner_id = auth.uid());

grant select, insert, delete on email_lists to authenticated;
