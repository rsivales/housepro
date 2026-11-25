create table public.news_comment_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  disabled_article_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.news_comment_settings(id) values (true) on conflict do nothing;

create table public.news_comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  author_name text not null check (char_length(author_name) between 2 and 80),
  author_email text not null,
  body text not null check (char_length(body) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index news_comments_article_status_idx on public.news_comments(article_id,status,created_at desc);
create index news_comments_email_created_idx on public.news_comments(author_email,created_at desc);
alter table public.news_comment_settings enable row level security;
alter table public.news_comments enable row level security;
revoke all on public.news_comment_settings,public.news_comments from public,anon,authenticated;
grant all on public.news_comment_settings,public.news_comments to service_role;
