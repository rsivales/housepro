-- HousePro — criar o bucket de media dos imóveis + políticas de acesso.
-- Cola no SQL Editor do Supabase e corre uma vez. Substitui o clique no dashboard.

insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do update set public = true;

-- Leitura pública das fotos
drop policy if exists "property-media public read" on storage.objects;
create policy "property-media public read" on storage.objects
  for select using (bucket_id = 'property-media');

-- Upload/gestão por utilizadores autenticados
drop policy if exists "property-media insert" on storage.objects;
create policy "property-media insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-media');

drop policy if exists "property-media update" on storage.objects;
create policy "property-media update" on storage.objects
  for update to authenticated using (bucket_id = 'property-media');

drop policy if exists "property-media delete" on storage.objects;
create policy "property-media delete" on storage.objects
  for delete to authenticated using (bucket_id = 'property-media');
