-- Helix Transaction Manager — Fase 1: motor de checklist pré-escritura + alertas.
-- Complementa 20261123231500_helix_transaction_manager.sql (deal_tasks, deal_task_events,
-- deal_alert_dispatches, colunas em deals), já mergeado do PR #114.
begin;

-- Mediação de documentos por audiência (comprador/vendedor/interno) — preparação
-- para a fase 2 (portais). Aditivo: documentos existentes ficam 'internal'.
alter table public.deal_documents
  add column if not exists audience text not null default 'internal'
    check (audience in ('internal','buyer','seller')),
  add column if not exists requested_by uuid references public.profiles(id),
  add column if not exists task_id uuid references public.deal_tasks(id) on delete set null;

-- Quando o prazo muda, a versão avança (desliga alertas já disparados para o
-- prazo antigo — dedupe em deal_alert_dispatches) e as tarefas da fase
-- correspondente seguem a nova data, em vez de ficarem presas à primeira.
create or replace function public.helix_sync_deal_deadlines() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.escritura_at is distinct from old.escritura_at
     or new.cpcv_deadline_at is distinct from old.cpcv_deadline_at then
    new.deadline_version := old.deadline_version + 1;
  end if;
  if new.escritura_at is distinct from old.escritura_at then
    update public.deal_tasks set due_at = new.escritura_at, updated_at = now()
      where deal_id = new.id and phase = 'pre_escritura';
  end if;
  if new.cpcv_deadline_at is distinct from old.cpcv_deadline_at then
    update public.deal_tasks set due_at = new.cpcv_deadline_at, updated_at = now()
      where deal_id = new.id and phase = 'pre_cpcv';
  end if;
  return new;
end $$;
revoke all on function public.helix_sync_deal_deadlines() from public, anon, authenticated;
drop trigger if exists helix_deal_deadlines_sync on public.deals;
create trigger helix_deal_deadlines_sync before update on public.deals
for each row execute function public.helix_sync_deal_deadlines();

-- ─────────────────────────────────────────────────────────────
-- Worker de alertas de prazo (mesmo desenho que helix_private.owner_report_worker):
-- segredo próprio, só acedido por service_role, para o cron bater em
-- /api/cron/transaction-deadlines sem expor nada a clientes.
-- ─────────────────────────────────────────────────────────────
create table if not exists helix_private.transaction_alerts_worker (
  id boolean primary key default true check (id),
  secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
  lock_token uuid,
  lock_until timestamptz,
  last_run_at timestamptz
);
alter table helix_private.transaction_alerts_worker enable row level security;
revoke all on helix_private.transaction_alerts_worker from public, anon, authenticated;
insert into helix_private.transaction_alerts_worker(id) values (true) on conflict (id) do nothing;

create or replace function public.transaction_alerts_worker_access(p_token uuid default null, p_release boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r helix_private.transaction_alerts_worker;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb->>'role' is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_token is null then
    select * into r from helix_private.transaction_alerts_worker where id;
    return jsonb_build_object('secret', r.secret);
  end if;
  if p_release then
    update helix_private.transaction_alerts_worker set lock_until = null, lock_token = null, last_run_at = now()
      where id and lock_token = p_token;
    return jsonb_build_object('released', found);
  end if;
  update helix_private.transaction_alerts_worker set lock_token = p_token, lock_until = now() + interval '3 minutes'
    where id and (lock_until is null or lock_until < now());
  return jsonb_build_object('claimed', found);
end $$;
revoke all on function public.transaction_alerts_worker_access(uuid, boolean) from public, anon, authenticated;
grant execute on function public.transaction_alerts_worker_access(uuid, boolean) to service_role;

-- Diário, 07:00 UTC (08:00 em Lisboa no inverno) — cedo o suficiente para a
-- escalada do dia chegar à equipa antes do horário comercial.
select cron.schedule('helix-transaction-deadlines', '0 7 * * *', $job$
  select net.http_post(url:='https://housepro.pt/api/cron/transaction-deadlines',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
    body:='{}'::jsonb, timeout_milliseconds:=120000)
  from helix_private.transaction_alerts_worker where id;
$job$);

commit;
