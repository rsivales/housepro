-- HousePro — Milestone 2 · papéis múltiplos + transações (finalização)
-- Depende de 0001_init.sql.

-- ─────────────────────────────────────────────────────────────
-- Papéis múltiplos por utilizador
-- Um utilizador PODE acumular papéis (ex.: admin que também é coordenador).
-- `profiles.role` continua a ser o papel "principal"; `user_roles` é a
-- fonte de verdade para permissões.
-- ─────────────────────────────────────────────────────────────
create table user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role    user_role not null,
  primary key (user_id, role)
);
alter table user_roles enable row level security;
create policy "user_roles read" on user_roles for select using (true);

-- has_role: verdadeiro se o utilizador tem o papel pedido OU é admin
-- (o admin tem implicitamente os poderes de coordenador/agente).
create or replace function has_role(r user_role) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and (ur.role = r or ur.role = 'admin')
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- Estados do processo
-- ─────────────────────────────────────────────────────────────
-- Via transacional
create type deal_stage as enum (
  'proposta_enviada', 'proposta_aceite', 'reserva', 'cpcv', 'escritura',
  'concluido', 'cancelado'
);
-- Via crédito bancário (paralela)
create type credit_stage as enum (
  'sem_credito', 'pedido', 'aprovacao', 'avaliacao', 'escritura_marcada'
);
create type deal_doc_kind as enum (
  'identificacao', 'comprovativo_morada', 'mandato', 'cert_energetico',
  'caderneta', 'cpcv', 'comprovativo_reserva', 'aprovacao_credito',
  'avaliacao_banco', 'outro'
);

-- Percentagem concluída por etapa (reflexo nas áreas de cliente/agente)
create or replace function stage_percent(s deal_stage) returns int
  language sql immutable as $$
  select case s
    when 'proposta_enviada' then 10
    when 'proposta_aceite'  then 30
    when 'reserva'          then 50
    when 'cpcv'             then 75
    when 'escritura'        then 95
    when 'concluido'        then 100
    when 'cancelado'        then 0
  end
$$;

-- ─────────────────────────────────────────────────────────────
-- Transações (deals)
-- ─────────────────────────────────────────────────────────────
create table deals (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references properties (id) on delete set null,
  agency_id     uuid not null references agencies (id),  -- RLS por agência
  -- Clientes (podem ter conta no portal — ou apenas nome/contacto)
  buyer_user_id  uuid references auth.users (id),
  seller_user_id uuid references auth.users (id),
  buyer_name   text,
  seller_name  text,
  -- Equipa interna
  angariador_id           uuid references profiles (id),  -- angariou o imóvel
  consultor_comprador_id  uuid references profiles (id),  -- levou o comprador (referrer)
  coordenador_id          uuid references profiles (id),  -- responsável pela finalização
  -- Estado
  stage        deal_stage not null default 'proposta_enviada',
  credit_stage credit_stage not null default 'sem_credito',
  amount       numeric(12,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index deals_agency_idx on deals (agency_id);
create index deals_coordenador_idx on deals (coordenador_id);

-- Equipa de consultores envolvida (para além dos papéis fixos acima)
create table deal_participants (
  deal_id      uuid not null references deals (id) on delete cascade,
  profile_id   uuid not null references profiles (id) on delete cascade,
  role_in_deal text not null default 'consultor',  -- angariador|consultor_comprador|coordenador|consultor
  primary key (deal_id, profile_id)
);

create table deal_documents (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  kind        deal_doc_kind not null default 'outro',
  url         text not null,
  uploaded_by uuid references profiles (id),
  created_at  timestamptz not null default now()
);

-- Linha do tempo / auditoria das mudanças de etapa
create table deal_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals (id) on delete cascade,
  track      text not null default 'transacional',  -- transacional | credito
  from_stage text,
  to_stage   text not null,
  actor_id   uuid references profiles (id),
  note       text,
  created_at timestamptz not null default now()
);
create index deal_events_deal_idx on deal_events (deal_id);

-- ─────────────────────────────────────────────────────────────
-- Quem pode ver a transação? (participantes internos + clientes)
-- ─────────────────────────────────────────────────────────────
create or replace function can_view_deal(d deals) returns boolean
  language sql stable security definer set search_path = public as $$
  select
    d.buyer_user_id = auth.uid()
    or d.seller_user_id = auth.uid()
    or d.angariador_id = auth.uid()
    or d.consultor_comprador_id = auth.uid()
    or d.coordenador_id = auth.uid()
    or exists (select 1 from deal_participants dp
               where dp.deal_id = d.id and dp.profile_id = auth.uid())
    or (has_role('coordenador') and d.agency_id = auth_agency())
$$;

-- ─────────────────────────────────────────────────────────────
-- Finalização: só coordenador (ou admin) da agência avança as etapas.
-- Regista o evento e reflete a percentagem automaticamente.
-- ─────────────────────────────────────────────────────────────
create or replace function advance_deal(p_deal uuid, p_to deal_stage, p_note text default null)
  returns deals language plpgsql security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal;
  if not found then raise exception 'deal não encontrado'; end if;
  if not (has_role('coordenador') and d.agency_id = auth_agency()) then
    raise exception 'apenas a coordenação da agência pode finalizar transações';
  end if;

  insert into deal_events (deal_id, track, from_stage, to_stage, actor_id, note)
  values (p_deal, 'transacional', d.stage::text, p_to::text, auth.uid(), p_note);

  update deals set stage = p_to, updated_at = now() where id = p_deal returning * into d;
  return d;
end $$;

create or replace function advance_credit(p_deal uuid, p_to credit_stage, p_note text default null)
  returns deals language plpgsql security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal;
  if not found then raise exception 'deal não encontrado'; end if;
  if not (has_role('coordenador') and d.agency_id = auth_agency()) then
    raise exception 'apenas a coordenação da agência pode atualizar o crédito';
  end if;

  insert into deal_events (deal_id, track, from_stage, to_stage, actor_id, note)
  values (p_deal, 'credito', d.credit_stage::text, p_to::text, auth.uid(), p_note);

  update deals set credit_stage = p_to, updated_at = now() where id = p_deal returning * into d;
  return d;
end $$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table deals             enable row level security;
alter table deal_participants enable row level security;
alter table deal_documents    enable row level security;
alter table deal_events       enable row level security;

create policy "deals view participants"   on deals for select using (can_view_deal(deals));
create policy "deals insert coord"         on deals for insert
  with check (has_role('coordenador') and agency_id = auth_agency());
-- Nota: mudanças de etapa passam pelas funções advance_deal/advance_credit
-- (security definer). Update direto reservado à coordenação da agência.
create policy "deals update coord"         on deals for update
  using (has_role('coordenador') and agency_id = auth_agency());

create policy "deal_participants view" on deal_participants for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

create policy "deal_documents view" on deal_documents for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));
create policy "deal_documents upload" on deal_documents for insert
  with check (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

create policy "deal_events view" on deal_events for select
  using (exists (select 1 from deals d where d.id = deal_id and can_view_deal(d)));

-- Bucket privado para documentos do processo
insert into storage.buckets (id, name, public) values ('deal-docs', 'deal-docs', false)
on conflict (id) do nothing;
create policy "deal docs read participants" on storage.objects for select
  using (bucket_id = 'deal-docs' and auth.role() = 'authenticated');
create policy "deal docs upload" on storage.objects for insert
  with check (bucket_id = 'deal-docs' and auth.role() = 'authenticated');
