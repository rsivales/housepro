-- Workspace legal por processo — correr no SQL Editor do Supabase.
create table if not exists legal_workspaces (
  process_id text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table legal_workspaces enable row level security;
drop policy if exists "legal_workspaces staff read" on legal_workspaces;
create policy "legal_workspaces staff read" on legal_workspaces
  for select using (exists (select 1 from profiles p where p.id = auth.uid()));
drop policy if exists "legal_workspaces staff write" on legal_workspaces;
create policy "legal_workspaces staff write" on legal_workspaces
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = auth.uid()));
grant select, insert, update on legal_workspaces to authenticated;
