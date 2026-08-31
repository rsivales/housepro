-- Portal do comprador: favoritos por-utilizador — correr no SQL Editor.
create table if not exists buyer_favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  property_id text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);
alter table buyer_favorites enable row level security;
drop policy if exists "buyer favorites select own" on buyer_favorites;
create policy "buyer favorites select own" on buyer_favorites for select using (user_id = auth.uid());
drop policy if exists "buyer favorites insert own" on buyer_favorites;
create policy "buyer favorites insert own" on buyer_favorites for insert with check (user_id = auth.uid());
drop policy if exists "buyer favorites delete own" on buyer_favorites;
create policy "buyer favorites delete own" on buyer_favorites for delete using (user_id = auth.uid());
grant select, insert, delete on buyer_favorites to authenticated;
