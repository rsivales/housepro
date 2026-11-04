-- Exact property addresses contain personal/security-sensitive location data.
-- Keep them outside the public-readable properties table; only server-side
-- service-role code can access this table.
create table if not exists public.property_addresses (
  property_id uuid primary key references public.properties(id) on delete cascade,
  street_name text,
  street_number text,
  postal_code text,
  updated_at timestamptz not null default now()
);

alter table public.property_addresses enable row level security;
revoke all on table public.property_addresses from anon, authenticated;
grant all on table public.property_addresses to service_role;

comment on table public.property_addresses is 'Private exact address fields; public display is controlled by properties.location_privacy.';
