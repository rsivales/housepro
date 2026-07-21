-- HousePro — campos ricos do imóvel + documentos. Depende de 0001.

alter table properties
  add column if not exists short_description text,
  add column if not exists description      text,
  add column if not exists seo_title        text,
  add column if not exists seo_description   text,
  add column if not exists slug             text,
  add column if not exists keywords         text,
  add column if not exists construction_year int,
  add column if not exists elevator         boolean default false,
  add column if not exists ramp             boolean default false,
  add column if not exists parking          boolean default false,
  add column if not exists view             text,
  add column if not exists equipment        text[] default '{}',
  add column if not exists community         text,
  add column if not exists watermark        boolean default true;

create unique index if not exists properties_slug_idx on properties (slug);

-- Documentos do imóvel (caderneta, cert. energético, planta, …)
create table if not exists property_documents (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  kind        text not null default 'outro',
  url         text not null,
  -- Resultado da leitura/validação (OCR): campos extraídos e confirmação.
  validated   boolean not null default false,
  extracted   jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists property_documents_property_idx on property_documents (property_id);

alter table property_documents enable row level security;
create policy "property_documents view" on property_documents for select
  using (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  );
create policy "property_documents write" on property_documents for all
  using (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  )
  with check (
    exists (select 1 from properties p where p.id = property_id
            and (p.agent_id = auth.uid() or agency_id_of(p.agent_id) = auth_agency()))
  );

-- Bucket privado para documentos do imóvel
insert into storage.buckets (id, name, public) values ('property-docs', 'property-docs', false)
on conflict (id) do nothing;
