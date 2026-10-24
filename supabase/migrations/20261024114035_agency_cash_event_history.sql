alter table public.agency_cash_entries add column updated_by uuid references public.profiles(id);
alter table public.agency_cash_entries add column updated_at timestamptz not null default now();
create table public.agency_cash_entry_events (
 id uuid primary key default gen_random_uuid(),
 entry_id uuid not null references public.agency_cash_entries(id) on delete restrict,
 agency_id uuid not null references public.agencies(id) on delete restrict,
 action text not null check(action in('created','voided','restored')),
 actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.agency_cash_entry_events enable row level security;
revoke all on public.agency_cash_entry_events from anon,authenticated;
grant all on public.agency_cash_entry_events to service_role;
create index agency_cash_event_scope on public.agency_cash_entry_events(agency_id,created_at desc);
create or replace function helix_private.audit_agency_cash_entry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into public.agency_cash_entry_events(entry_id,agency_id,action,actor_id) values(new.id,new.agency_id,'created',new.created_by);
 elsif new.voided_at is distinct from old.voided_at then
  insert into public.agency_cash_entry_events(entry_id,agency_id,action,actor_id) values(new.id,new.agency_id,case when new.voided_at is null then 'restored' else 'voided' end,coalesce(new.updated_by,new.created_by));
 end if;
 return new;
end;$$;
revoke all on function helix_private.audit_agency_cash_entry() from public,anon,authenticated;
create trigger audit_agency_cash_entry after insert or update on public.agency_cash_entries for each row execute function helix_private.audit_agency_cash_entry();
