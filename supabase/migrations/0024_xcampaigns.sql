-- HousePro / Helix — F4: X Campaigns (email marketing).
--
-- Campanhas de email com blocos (jsonb), segmento (jsonb) e estatísticas. Os
-- envios ficam registados (email_sends) e a lista de supressões (unsubscribe /
-- devoluções) garante que não se comunica com quem não deve. O envio real só
-- acontece com credenciais e autorização — em desenvolvimento é sandbox.
--
-- Aditiva e idempotente. Depende de 0001–0023. NÃO é aplicada automaticamente.

create table if not exists email_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'campanha',
  subject     text not null,
  preheader   text,
  blocks      jsonb not null default '[]',
  segment     jsonb not null default '{}',
  status      text not null default 'rascunho', -- rascunho|agendada|sandbox|enviada
  schedule_at timestamptz,
  owner_id    uuid references profiles (id) on delete set null,
  stats       jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists email_campaigns_owner_idx on email_campaigns (owner_id, created_at desc);

create table if not exists email_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns (id) on delete cascade,
  contact_id  uuid references contacts (id) on delete set null,
  email       text,
  status      text not null default 'sandbox', -- sandbox|sent|delivered|opened|clicked|bounced|unsubscribed
  sandbox     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists email_sends_campaign_idx on email_sends (campaign_id);

-- Supressões: quem cancelou subscrição ou devolveu — nunca receber.
create table if not exists email_suppressions (
  email      text primary key,
  reason     text,            -- unsubscribe | bounce | complaint | manual
  created_at timestamptz not null default now()
);

alter table email_campaigns    enable row level security;
alter table email_sends        enable row level security;
alter table email_suppressions enable row level security;

drop policy if exists email_campaigns_scope on email_campaigns;
create policy email_campaigns_scope on email_campaigns
  for all using (owner_id = auth.uid() or is_meta_staff())
  with check (owner_id = auth.uid() or is_meta_staff());

drop policy if exists email_sends_scope on email_sends;
create policy email_sends_scope on email_sends
  for all using (
    is_meta_staff()
    or exists (select 1 from email_campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
  ) with check (
    is_meta_staff()
    or exists (select 1 from email_campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
  );

-- Supressões: leitura a autenticados (para respeitar antes de enviar), escrita a staff.
drop policy if exists email_suppressions_read on email_suppressions;
create policy email_suppressions_read on email_suppressions
  for select using (auth.uid() is not null);
drop policy if exists email_suppressions_write on email_suppressions;
create policy email_suppressions_write on email_suppressions
  for all using (is_meta_staff()) with check (is_meta_staff());
