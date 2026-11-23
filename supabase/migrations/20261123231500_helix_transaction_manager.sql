-- Helix Transaction Manager — additive schema (review and stage before production)
-- Never exposes sensitive documents to client roles by default.
begin;
alter table public.deals
  add column if not exists escritura_at timestamptz,
  add column if not exists cpcv_deadline_at timestamptz,
  add column if not exists transaction_manager_id uuid references public.profiles(id),
  add column if not exists deadline_version integer not null default 1;

create table if not exists public.deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  code text not null,
  title text not null,
  phase text not null check (phase in ('pre_cpcv','post_cpcv','pre_escritura','post_escritura','credito')),
  audience text not null default 'internal' check (audience in ('internal','buyer','seller')),
  applicability text not null default 'required' check (applicability in ('required','optional','not_applicable')),
  status text not null default 'pending' check (status in ('pending','requested','received','in_review','validated','rejected','waived')),
  critical boolean not null default false,
  owner_id uuid references public.profiles(id),
  due_at timestamptz,
  evidence_document_id uuid references public.deal_documents(id),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, code),
  constraint validation_consistency check (
    (status <> 'validated' or (validated_by is not null and validated_at is not null))
    and (status <> 'waived' or nullif(trim(waiver_reason),'') is not null)
  )
);
create index if not exists deal_tasks_deal_due_idx on public.deal_tasks(deal_id,due_at);
alter table public.deal_tasks enable row level security;
-- Deliberately internal-only for initial release: client access will be mediated by
-- separate scoped APIs after audience/document visibility has been security tested.
create policy "deal_tasks internal read" on public.deal_tasks for select to authenticated
using (exists (
  select 1 from public.deals d where d.id = deal_id
    and (d.angariador_id = (select auth.uid())
      or d.consultor_comprador_id = (select auth.uid())
      or d.coordenador_id = (select auth.uid())
      or d.transaction_manager_id = (select auth.uid())
      or exists (select 1 from public.deal_participants p where p.deal_id=d.id and p.profile_id=(select auth.uid()))
      or (public.has_role('coordenador') and d.agency_id=public.auth_agency()))
));
create policy "deal_tasks internal insert" on public.deal_tasks for insert to authenticated
with check (exists (select 1 from public.deals d where d.id=deal_id
  and (d.coordenador_id=(select auth.uid()) or d.transaction_manager_id=(select auth.uid())
       or (public.has_role('coordenador') and d.agency_id=public.auth_agency()))));
create policy "deal_tasks internal update" on public.deal_tasks for update to authenticated
using (exists (select 1 from public.deals d where d.id=deal_id
  and (d.coordenador_id=(select auth.uid()) or d.transaction_manager_id=(select auth.uid())
       or (public.has_role('coordenador') and d.agency_id=public.auth_agency()))))
with check (exists (select 1 from public.deals d where d.id=deal_id
  and (d.coordenador_id=(select auth.uid()) or d.transaction_manager_id=(select auth.uid())
       or (public.has_role('coordenador') and d.agency_id=public.auth_agency()))));

create table if not exists public.deal_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.deal_tasks(id) on delete cascade,
  actor_id uuid not null default auth.uid(),
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.deal_task_events enable row level security;
create policy "deal_task_events internal read" on public.deal_task_events for select to authenticated
using (exists (select 1 from public.deal_tasks t where t.id=task_id));
-- Event writes via trigger, never arbitrary client inserts.
create or replace function public.helix_log_task_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.deal_task_events(task_id,actor_id,old_status,new_status)
    values (new.id,auth.uid(),case when tg_op='INSERT' then null else old.status end,new.status);
  end if;
  return new;
end $$;
revoke all on function public.helix_log_task_change() from public, anon, authenticated;
drop trigger if exists helix_task_audit on public.deal_tasks;
create trigger helix_task_audit after insert or update on public.deal_tasks
for each row execute function public.helix_log_task_change();

create table if not exists public.deal_alert_dispatches (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  obligation_code text not null,
  deadline_version integer not null,
  milestone_days integer not null,
  channel text not null check (channel in ('email','internal')),
  recipient_id uuid not null,
  sent_at timestamptz not null default now(),
  unique (deal_id,obligation_code,deadline_version,milestone_days,channel,recipient_id)
);
alter table public.deal_alert_dispatches enable row level security;
-- Server-only table; service role can dispatch after verified authorization.
commit;