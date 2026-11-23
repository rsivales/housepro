-- Helix: restrict deal-docs Storage to authorized INTERNAL deal participants.
-- REVIEW BEFORE APPLYING. Existing bucket is empty at audit time (2026-11-23).
-- Required object path: <deal_uuid>/<filename>; clients use mediated upload
-- endpoints after implementing per-document audience permissions.
-- This is deliberately stricter than the old blanket authenticated policies.
begin;

drop policy if exists "deal docs read participants" on storage.objects;
drop policy if exists "deal docs upload" on storage.objects;

create policy "deal docs read internal participants"
on storage.objects for select to authenticated
using (
  bucket_id = 'deal-docs'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.deals d
    where d.id = ((storage.foldername(name))[1])::uuid
      and (
        d.angariador_id = (select auth.uid())
        or d.consultor_comprador_id = (select auth.uid())
        or d.coordenador_id = (select auth.uid())
        
        or (public.has_role('coordenador') and d.agency_id = public.auth_agency())
      )
  )
);

create policy "deal docs upload internal participants"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'deal-docs'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.deals d
    where d.id = ((storage.foldername(name))[1])::uuid
      and (
        d.angariador_id = (select auth.uid())
        or d.consultor_comprador_id = (select auth.uid())
        or d.coordenador_id = (select auth.uid())
        
        or (public.has_role('coordenador') and d.agency_id = public.auth_agency())
      )
  )
);

commit;
