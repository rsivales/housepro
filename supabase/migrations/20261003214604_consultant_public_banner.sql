-- Public consultant media: immutable uploads, reviewed banner, atomic decision.
alter table public.profiles add column if not exists banner_url text;
alter table public.profile_change_requests add column if not exists banner_url text;
alter table public.profile_change_requests add column if not exists banner_changed boolean not null default false;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('consultant-media','consultant-media',true,4194304,array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;
create policy "consultant media own insert" on storage.objects for insert to authenticated
with check (bucket_id = 'consultant-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists(select 1 from public.profiles where id = (select auth.uid()) and active = true));
-- No UPDATE/DELETE policy: an approved URL can never be replaced by an unreviewed upload.
create policy "consultant media public read" on storage.objects for select to anon, authenticated
using (bucket_id = 'consultant-media');

drop policy if exists "profile_req_insert_own" on public.profile_change_requests;
create policy "profile_req_insert_own" on public.profile_change_requests for insert to authenticated
with check (profile_id = (select auth.uid()) and status = 'pendente' and decided_by is null and decided_at is null);

drop policy if exists "profile_req_update_own_pending" on public.profile_change_requests;
create policy "profile_req_update_own_pending" on public.profile_change_requests for update to authenticated
using (profile_id = (select auth.uid()) and status = 'pendente')
with check (profile_id = (select auth.uid()) and status in ('pendente','cancelado') and decided_by is null and decided_at is null);
create unique index if not exists profile_change_one_pending on public.profile_change_requests(profile_id) where status = 'pendente';

-- Protect the public photo/banner even if a client bypasses the application API.
-- Existing server administration uses service_role; preferences/settings remain editable.
create or replace function public.guard_consultant_media() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') and (
    new.photo_url is distinct from old.photo_url or new.banner_url is distinct from old.banner_url
  ) then raise exception 'Public profile images require editorial approval' using errcode = '42501'; end if;
  return new;
end;
$$;
revoke all on function public.guard_consultant_media() from public,anon,authenticated;
create trigger consultant_media_approval_guard before update on public.profiles
for each row execute function public.guard_consultant_media();

-- Service-only transaction: row lock prevents racing approval/cancellation;
-- a failed profile update rolls back the decision as well.
create or replace function public.decide_profile_change(p_request_id uuid, p_actor_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare req public.profile_change_requests%rowtype;
begin
  if p_decision not in ('aprovado','recusado') then raise exception 'invalid_decision'; end if;
  if not exists(select 1 from public.profiles where id = p_actor_id and role_key = 'superadmin' and active = true) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into req from public.profile_change_requests where id = p_request_id for update;
  if not found then raise exception 'not_found'; end if;
  if req.status <> 'pendente' then raise exception 'already_decided'; end if;
  if p_decision = 'aprovado' then
    update public.profiles set
      name = coalesce(nullif(req.name,''),name),
      photo_url = coalesce(nullif(req.photo_url,''),photo_url),
      whatsapp = coalesce(nullif(req.whatsapp,''),whatsapp),
      public_title = coalesce(nullif(req.public_title,''),public_title),
      banner_url = case when req.banner_changed then nullif(req.banner_url,'') else banner_url end
    where id = req.profile_id;
    if not found then raise exception 'profile_not_found'; end if;
  end if;
  update public.profile_change_requests set status = p_decision, note = p_note, decided_by = p_actor_id, decided_at = now() where id = p_request_id;
end;
$$;
revoke all on function public.decide_profile_change(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.decide_profile_change(uuid,uuid,text,text) to service_role;
grant all on public.profile_change_requests to service_role;
notify pgrst, 'reload schema';
