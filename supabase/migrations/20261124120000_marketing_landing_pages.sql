create table public.marketing_landing_pages (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null, description text not null default '', image_url text,
 created_by uuid not null references public.profiles(id),
 agency_id uuid references public.agencies(id),
 status text not null default 'draft' check(status in ('draft','published','inactive')),
 property_ids uuid[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index marketing_landing_pages_owner_idx on public.marketing_landing_pages(created_by);
create table public.marketing_landing_events (
 id bigint generated always as identity primary key,
 landing_id uuid not null references public.marketing_landing_pages(id) on delete cascade,
 property_id uuid references public.properties(id) on delete set null,
 kind text not null check(kind in ('view','property_click')),
 created_at timestamptz not null default now()
);
create index marketing_landing_events_report_idx on public.marketing_landing_events(landing_id,kind,created_at);
alter table public.marketing_landing_pages enable row level security;
alter table public.marketing_landing_events enable row level security;
grant select,insert,update,delete on public.marketing_landing_pages to authenticated;
grant select on public.marketing_landing_events to authenticated;
create policy marketing_landing_owner_read on public.marketing_landing_pages for select to authenticated
 using(created_by=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role_key in ('superadmin','admin','marketing','diretor','coordenador')));
create policy marketing_landing_owner_insert on public.marketing_landing_pages for insert to authenticated
 with check(created_by=(select auth.uid()) and (agency_id is null or agency_id=(select public.auth_agency())));
create policy marketing_landing_owner_update on public.marketing_landing_pages for update to authenticated
 using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()) and (agency_id is null or agency_id=(select public.auth_agency())));
create policy marketing_landing_owner_delete on public.marketing_landing_pages for delete to authenticated using(created_by=(select auth.uid()));
create policy marketing_landing_events_owner_read on public.marketing_landing_events for select to authenticated
 using(exists(select 1 from public.marketing_landing_pages l where l.id=landing_id and (l.created_by=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role_key in ('superadmin','admin','marketing','diretor','coordenador')))));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('campaign-images','campaign-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
