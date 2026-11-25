-- Envios institucionais sazonais (Natal, Páscoa, Carnaval, feriados
-- emblemáticos, aniversário) + editor dos templates de notificação do
-- sistema. Aditivo, seguro repetir.
begin;

alter table public.contacts add column if not exists birth_date date;
alter table public.profiles add column if not exists birth_date date;

create table if not exists public.institutional_messages (
  id uuid primary key default gen_random_uuid(),
  occasion_key text not null check (occasion_key in (
    'natal','pascoa','carnaval','abril_25','halloween','santos_populares',
    'dia_mae','dia_pai','aniversario'
  )),
  audience text not null check (audience in ('clientes','consultores','brokers')),
  subject text not null,
  body text not null,
  enabled boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (occasion_key, audience)
);
alter table public.institutional_messages enable row level security;
revoke all on public.institutional_messages from public, anon, authenticated;
grant select, insert, update on public.institutional_messages to service_role;

create table if not exists public.institutional_send_log (
  id uuid primary key default gen_random_uuid(),
  occasion_key text not null,
  audience text not null,
  year integer not null,
  recipient_id uuid,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  unique (occasion_key, audience, year, recipient_email)
);
alter table public.institutional_send_log enable row level security;
revoke all on public.institutional_send_log from public, anon, authenticated;
grant select, insert on public.institutional_send_log to service_role;

create table if not exists public.notification_templates (
  key text primary key,
  subject text not null,
  body text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.notification_templates enable row level security;
revoke all on public.notification_templates from public, anon, authenticated;
grant select, insert, update on public.notification_templates to service_role;

-- Worker de envio diário — mesmo desenho que helix_private.transaction_alerts_worker.
create table if not exists helix_private.institutional_sends_worker (
  id boolean primary key default true check (id),
  secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
  lock_token uuid,
  lock_until timestamptz,
  last_run_at timestamptz
);
alter table helix_private.institutional_sends_worker enable row level security;
revoke all on helix_private.institutional_sends_worker from public, anon, authenticated;
insert into helix_private.institutional_sends_worker(id) values (true) on conflict (id) do nothing;

create or replace function public.institutional_sends_worker_access(p_token uuid default null, p_release boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r helix_private.institutional_sends_worker;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb->>'role' is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_token is null then
    select * into r from helix_private.institutional_sends_worker where id;
    return jsonb_build_object('secret', r.secret);
  end if;
  if p_release then
    update helix_private.institutional_sends_worker set lock_until = null, lock_token = null, last_run_at = now()
      where id and lock_token = p_token;
    return jsonb_build_object('released', found);
  end if;
  update helix_private.institutional_sends_worker set lock_token = p_token, lock_until = now() + interval '3 minutes'
    where id and (lock_until is null or lock_until < now());
  return jsonb_build_object('claimed', found);
end $$;
revoke all on function public.institutional_sends_worker_access(uuid, boolean) from public, anon, authenticated;
grant execute on function public.institutional_sends_worker_access(uuid, boolean) to service_role;

-- Diário, 08:00 UTC (hora a que a direção já está a trabalhar, mas cedo o
-- suficiente para os feriados/aniversários chegarem de manhã).
select cron.schedule('helix-institutional-sends', '0 8 * * *', $job$
  select net.http_post(url:='https://housepro.pt/api/cron/institutional-sends',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
    body:='{}'::jsonb, timeout_milliseconds:=120000)
  from helix_private.institutional_sends_worker where id;
$job$);

commit;
