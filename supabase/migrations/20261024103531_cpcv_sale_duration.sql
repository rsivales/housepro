alter table public.properties add column if not exists cpcv_at date;
comment on column public.properties.cpcv_at is 'CPCV signing date; the end date for advertised time to sell.';
-- The CRM defines entry into CPCV as an already signed contract. Recover dates
-- only from that event, using the most recent non-cancelled transaction.
with latest_deal as (
 select distinct on (property_id) id,property_id from public.deals
 where property_id is not null and stage::text <> 'cancelado'
 order by property_id,created_at desc,id
), signed as (
 select d.property_id, (max(e.created_at) at time zone 'Europe/Lisbon')::date as signed_at
 from latest_deal d join public.deal_events e on e.deal_id=d.id
 where e.track='transacional' and e.to_stage='cpcv' group by d.property_id
)
update public.properties p set cpcv_at=s.signed_at from signed s
where p.id=s.property_id and p.cpcv_at is null and p.status::text in ('cpcv','vendido')
 and s.signed_at >= p.listed_at and (p.sold_at is null or s.signed_at <= p.sold_at);

create or replace function helix_private.record_property_cpcv()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.operation::text='venda' then
  if new.status::text='cpcv' then
   if TG_OP='INSERT' then
    new.cpcv_at := coalesce(new.cpcv_at,(now() at time zone 'Europe/Lisbon')::date);
   elsif old.status is distinct from new.status then
    if new.cpcv_at is not distinct from old.cpcv_at then
     new.cpcv_at := (now() at time zone 'Europe/Lisbon')::date;
    else
     new.cpcv_at := coalesce(new.cpcv_at,(now() at time zone 'Europe/Lisbon')::date);
    end if;
   end if;
  elsif TG_OP='UPDATE' and old.status::text in ('cpcv','vendido') and new.status::text not in ('cpcv','vendido') then
   new.cpcv_at := null;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function helix_private.record_property_cpcv() from public,anon,authenticated;
drop trigger if exists record_property_cpcv on public.properties;
create trigger record_property_cpcv before insert or update on public.properties
for each row execute function helix_private.record_property_cpcv();
