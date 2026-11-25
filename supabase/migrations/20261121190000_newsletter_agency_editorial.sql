alter table public.marketing_subscriptions
 add column agency_id uuid references public.agencies(id) on delete set null,
 add column pending_agency_id uuid references public.agencies(id) on delete set null;

create table public.newsletter_campaigns (
 id uuid primary key default gen_random_uuid(),
 seed_key text unique,
 scope text not null check (scope in ('brand','agency')),
 agency_id uuid references public.agencies(id) on delete cascade,
 title text not null,
 intro text not null default '',
 article_ids text[] not null default '{}',
 local_news_id text,
 status text not null default 'queued' check (status in ('draft','queued','sending','sent')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 check ((scope='brand' and agency_id is null and local_news_id is null) or (scope='agency' and agency_id is not null and local_news_id is not null))
);
create table public.newsletter_deliveries (
 campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
 email text not null,
 status text not null default 'pending' check (status in ('pending','sent')),
 resend_id text,
 sent_at timestamptz,
 primary key(campaign_id,email)
);
create index newsletter_campaigns_scope_status_idx on public.newsletter_campaigns(scope,agency_id,status);
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;
revoke all on public.newsletter_campaigns,public.newsletter_deliveries from public,anon,authenticated;
grant all on public.newsletter_campaigns,public.newsletter_deliveries to service_role;

insert into public.newsletter_campaigns(seed_key,scope,title,intro,article_ids,status) values
 ('editorial-2026-legislacao','brand','Legislação e habitação · novembro 2026','O que mudou nas mais-valias e o que continua em discussão no arrendamento.',array['mais-valias-arrendamento-2026','arrendamento-2026-regras-em-vigor'],'queued'),
 ('editorial-2026-mercado','brand','Mercado imobiliário · novembro 2026','Novos dados sobre rendas e crédito para interpretar o mercado com rigor.',array['rendas-novos-contratos-ine-2026','credito-habitacao-setembro-2026'],'queued'),
 ('editorial-2026-investimento','brand','Investimento imobiliário · novembro 2026','Incentivos e contratos de investimento: os requisitos antes da decisão.',array['contratos-investimento-arrendamento-2026','renda-moderada-fiscalidade-investidor-2026'],'queued'),
 ('editorial-2026-dicas','brand','Dicas para a casa · novembro 2026','Atualização de rendas e preparação de um pedido de crédito.',array['atualizacao-rendas-2027','comprar-casa-credito-2026-checklist'],'queued'),
 ('editorial-2026-eventos','brand','Agenda da habitação · novembro 2026','Debate legislativo e construção modular com contexto e próximos passos.',array['debate-arrendamento-novembro-2026','construcao-modular-anuncio-novembro-2026'],'queued'),
 ('editorial-2026-internacional','brand','Habitação na Europa · novembro 2026','O retrato europeu de Portugal e o efeito das taxas do BCE no crédito.',array['eu-habitacao-portugal-2026','bce-juros-habitacao-outubro-2026'],'queued')
on conflict(seed_key) do nothing;
