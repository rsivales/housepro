create table if not exists public.international_catalog (
  id text primary key,
  project jsonb not null,
  commercial jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  featured boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.international_catalog enable row level security;
revoke all on public.international_catalog from anon, authenticated;
grant select, insert, update on public.international_catalog to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('international-private', 'international-private', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;

create unique index if not exists international_catalog_featured_idx
  on public.international_catalog (featured) where featured and published;

create or replace function public.save_international_catalog(
  p_id text, p_expected timestamptz, p_project jsonb, p_commercial jsonb,
  p_published boolean, p_featured boolean
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  previous_version timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(632196213::bigint);
  select updated_at into previous_version from public.international_catalog where id = p_id;
  if previous_version is distinct from p_expected then
    return false;
  end if;
  if p_published and p_featured then
    update public.international_catalog
    set featured = false, updated_at = pg_catalog.clock_timestamp()
    where id <> p_id and featured and published;
  end if;
  insert into public.international_catalog (id, project, commercial, published, featured, updated_at)
  values (p_id, p_project, p_commercial, p_published, p_featured, pg_catalog.clock_timestamp())
  on conflict (id) do update set
    project = excluded.project, commercial = excluded.commercial,
    published = excluded.published, featured = excluded.featured, updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke all on function public.save_international_catalog(text, timestamptz, jsonb, jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.save_international_catalog(text, timestamptz, jsonb, jsonb, boolean, boolean) to service_role;
