create table if not exists public.mv_client_intake (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  client_name text,
  client_email text,
  answers jsonb,
  consent_at timestamptz,
  consent_text text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists mv_client_intake_agent_idx on public.mv_client_intake(agent_id,created_at desc);
alter table public.mv_client_intake enable row level security;
-- No public or authenticated RLS policy: access is mediated by server routes.
revoke all on public.mv_client_intake from anon, authenticated;
