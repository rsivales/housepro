-- #NN — Artigos do feed de notícias (reais, com revisão antes de publicar)
-- Substitui o placeholder estático (6 artigos fixos desde o início do
-- projeto) por uma tabela real: artigos entram como "pendente" (gerados
-- automaticamente, uma vez por semana) e só aparecem no site público depois
-- de aprovados — incluindo a confirmação da foto, para nunca mais publicar
-- sem revisão. Corre no Supabase (SQL Editor). Seguro repetir.

create table if not exists news_articles (
  id            uuid primary key default gen_random_uuid(),
  category      text not null default 'Mercado',
  title         text not null,
  excerpt       text not null,
  body          text[] not null default '{}',
  source        text not null default 'HousePro',
  source_url    text,
  article_date  date not null default current_date,
  image         text,
  status        text not null default 'pendente', -- pendente | aprovado | rejeitado
  decided_by    uuid references profiles (id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists news_articles_status_idx on news_articles (status, article_date desc);

alter table news_articles enable row level security;

-- Só o servidor (service_role) lê/escreve — tanto a ingestão semanal (chave
-- partilhada) como a fila de revisão (staff) passam por rotas de servidor.
-- RLS ativo sem políticas públicas fecha o acesso direto dos clientes.
