-- HousePro Signature: classificação editorial aplicada aos imóveis existentes.
-- Nenhum imóvel é promovido automaticamente; a publicação exige aprovação.
alter table public.properties
  add column if not exists is_signature boolean not null default false,
  add column if not exists signature_status text not null default 'candidate' check (signature_status in ('candidate','pending','approved','rejected')),
  add column if not exists signature_order integer,
  add column if not exists signature_hero_url text,
  add column if not exists signature_editorial_title text,
  add column if not exists signature_editorial_intro text,
  add column if not exists signature_attributes text[] not null default '{}',
  add column if not exists signature_collection text,
  add column if not exists signature_visibility text not null default 'private' check (signature_visibility in ('public','private')),
  add column if not exists signature_price_visible boolean not null default true,
  add column if not exists signature_featured boolean not null default false,
  add column if not exists signature_published_at timestamptz,
  add column if not exists signature_approved_by uuid references public.profiles(id),
  add column if not exists signature_approved_at timestamptz;

create index if not exists properties_signature_public_order_idx
  on public.properties (signature_order nulls last, listed_at desc)
  where is_signature and signature_status = 'approved' and signature_visibility = 'public';
