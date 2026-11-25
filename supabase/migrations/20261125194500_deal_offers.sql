-- Additive: registo de propostas e contrapropostas dentro de um negócio, com
-- estado (pendente/aceite/recusada/substituída) e autoria — para transparência
-- quando o negócio envolve dois agentes (angariador e consultor comprador,
-- inclusive de agências diferentes). Não substitui `property_activity_intakes`
-- (fichas de proposta documentadas, com upload obrigatório) — este é o registo
-- operacional da negociação, sem exigir documento a cada ronda.
create table public.deal_offers (
 id uuid primary key default gen_random_uuid(),
 deal_id uuid not null references public.deals(id) on delete cascade,
 kind text not null check(kind in ('proposta','contraproposta')),
 side text not null check(side in ('comprador','vendedor')),
 amount numeric(12,2) not null check(amount > 0),
 status text not null default 'pendente' check(status in ('pendente','aceite','recusada','substituida')),
 note text,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 decided_by uuid references public.profiles(id),
 decided_at timestamptz
);
create index deal_offers_deal_idx on public.deal_offers(deal_id, created_at);
-- Só pode haver uma proposta pendente de cada vez por negócio — a ronda
-- seguinte substitui-a (ver register_deal_offer).
create unique index deal_offers_one_pending on public.deal_offers(deal_id) where status = 'pendente';

alter table public.deal_offers enable row level security;
revoke all on public.deal_offers from public, anon, authenticated;
grant select, insert, update on public.deal_offers to authenticated;
grant all on public.deal_offers to service_role;

create policy deal_offers_view on public.deal_offers for select
 using (exists (select 1 from public.deals d where d.id = deal_offers.deal_id and public.can_view_deal(d)));
create policy deal_offers_insert on public.deal_offers for insert
 with check (exists (select 1 from public.deals d where d.id = deal_offers.deal_id and public.can_view_deal(d)));
create policy deal_offers_update on public.deal_offers for update
 using (exists (select 1 from public.deals d where d.id = deal_offers.deal_id and public.can_view_deal(d)));
