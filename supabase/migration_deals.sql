-- Negócios (processo transacional) persistidos + eventos de fase.
-- Faz a automação do estado do imóvel funcionar de verdade: ao avançar a fase
-- do negócio, o imóvel muda de estado (reserva→reservado, cpcv→cpcv,
-- escritura/concluído→vendido). Corre no Supabase (SQL Editor). Seguro repetir.
-- (Se já correste o setup completo, estas tabelas já existem — não faz mal.)

do $$ begin
  create type deal_stage as enum
    ('proposta_enviada','proposta_aceite','reserva','cpcv','escritura','concluido','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_stage as enum
    ('sem_credito','pedido','aprovacao','avaliacao','escritura_marcada');
exception when duplicate_object then null; end $$;

create table if not exists deals (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references properties (id) on delete set null,
  agency_id     uuid not null references agencies (id),
  buyer_user_id  uuid references auth.users (id),
  seller_user_id uuid references auth.users (id),
  buyer_name   text,
  seller_name  text,
  angariador_id           uuid references profiles (id),
  consultor_comprador_id  uuid references profiles (id),
  coordenador_id          uuid references profiles (id),
  stage        deal_stage not null default 'proposta_enviada',
  credit_stage credit_stage not null default 'sem_credito',
  amount       numeric(12,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists deals_agency_idx on deals (agency_id);
create index if not exists deals_property_idx on deals (property_id);

create table if not exists deal_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals (id) on delete cascade,
  track      text not null default 'transacional',
  from_stage text,
  to_stage   text not null,
  actor_id   uuid references profiles (id),
  note       text,
  created_at timestamptz not null default now()
);

-- Só o servidor (service_role) lê/escreve negócios; RLS activo sem políticas
-- públicas fecha o acesso directo dos clientes.
alter table deals enable row level security;
alter table deal_events enable row level security;
