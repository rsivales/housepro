-- HousePro — notificações in-app (ex.: override de rede quando um afilhado
-- gera comissão). Depende de 0001 (profiles).

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  type       text not null default 'info',   -- info | override | referral | approval
  title      text not null,
  body       text,
  amount     numeric,                         -- valor associado (ex.: override €)
  href       text,                            -- link opcional para abrir
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

drop policy if exists "notifications own read" on notifications;
create policy "notifications own read"
  on notifications for select using (user_id = auth.uid());

drop policy if exists "notifications own update" on notifications;
create policy "notifications own update"
  on notifications for update using (user_id = auth.uid());

-- Um consultor autenticado pode criar notificações para outros (ex.: creditar
-- override aos padrinhos ao fechar um negócio).
drop policy if exists "notifications insert authenticated" on notifications;
create policy "notifications insert authenticated"
  on notifications for insert with check (auth.role() = 'authenticated');

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);
