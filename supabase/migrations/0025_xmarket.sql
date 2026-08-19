-- HousePro / Helix — F5: X Market (marketplace, carteira e créditos).
--
-- Catálogo de produtos/serviços, carteira (saldo + créditos incluídos/consumidos),
-- livro-razão da carteira, e encomendas com estados e aprovação acima de valor.
-- Pagamentos/consumos são simulados em desenvolvimento (sem serviços pagos).
--
-- Aditiva e idempotente. Depende de 0001–0024. NÃO é aplicada automaticamente.

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'outros',
  price       numeric not null default 0,
  unit        text,
  supplier    text,
  credit_type text,             -- email|sms|whatsapp|xcall|meta_ads (recarga)
  credit_amount numeric,
  stock       integer,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists wallets (
  id                 uuid primary key default gen_random_uuid(),
  scope              text not null default 'agent',  -- agent|team|agency|cost_center
  owner_id           text not null,                  -- profile/team/agency id
  balance            numeric not null default 0,
  monthly_budget     numeric,
  monthly_spent      numeric not null default 0,
  approval_threshold numeric,
  block_when_empty   boolean not null default false,
  credits            jsonb not null default '[]',    -- [{type, included, consumed, unitCostExtra}]
  created_at         timestamptz not null default now()
);
create index if not exists wallets_owner_idx on wallets (scope, owner_id);

create table if not exists wallet_ledger (
  id         uuid primary key default gen_random_uuid(),
  wallet_id  uuid not null references wallets (id) on delete cascade,
  kind       text not null,        -- carga | consumo | encomenda | reembolso | ajuste
  credit_type text,                -- quando é consumo de crédito
  amount     numeric not null default 0,  -- € (ou nº de unidades quando credit_type)
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_wallet_idx on wallet_ledger (wallet_id, created_at desc);

create table if not exists orders (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid references profiles (id) on delete set null,
  total      numeric not null default 0,
  status     text not null default 'pendente_aprovacao',
  created_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on orders (buyer_id, created_at desc);

create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name       text not null,
  qty        integer not null default 1,
  unit_price numeric not null default 0
);
create index if not exists order_items_order_idx on order_items (order_id);

alter table products      enable row level security;
alter table wallets       enable row level security;
alter table wallet_ledger enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;

-- Catálogo: leitura a autenticados; escrita a staff (helper de 0020).
drop policy if exists products_read on products;
create policy products_read on products for select using (auth.uid() is not null);
drop policy if exists products_write on products;
create policy products_write on products for all using (is_meta_staff()) with check (is_meta_staff());

-- Carteira: o dono (agent scope) ou staff.
drop policy if exists wallets_scope on wallets;
create policy wallets_scope on wallets
  for all using (owner_id = auth.uid()::text or is_meta_staff())
  with check (owner_id = auth.uid()::text or is_meta_staff());

drop policy if exists wallet_ledger_scope on wallet_ledger;
create policy wallet_ledger_scope on wallet_ledger
  for all using (
    is_meta_staff()
    or exists (select 1 from wallets w where w.id = wallet_id and w.owner_id = auth.uid()::text)
  ) with check (
    is_meta_staff()
    or exists (select 1 from wallets w where w.id = wallet_id and w.owner_id = auth.uid()::text)
  );

-- Encomendas: o comprador ou staff.
drop policy if exists orders_scope on orders;
create policy orders_scope on orders
  for all using (buyer_id = auth.uid() or is_meta_staff())
  with check (buyer_id = auth.uid() or is_meta_staff());

drop policy if exists order_items_scope on order_items;
create policy order_items_scope on order_items
  for all using (
    is_meta_staff()
    or exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid())
  ) with check (
    is_meta_staff()
    or exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid())
  );
