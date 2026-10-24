-- Atomic private inbox notification for enquiries saved by server-side intake.
-- Public table read permissions and RLS remain unchanged.
create or replace function helix_private.notify_saved_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_agency uuid; property_ref text;
begin
  if auth.role() is distinct from 'service_role' then return new; end if;
  if new.owner_id is null then return new; end if;
  if coalesce(new.email,'') = '' and coalesce(new.contact,'') !~ '(@|^[+0-9 .()-]{7,}$)' then return new; end if;
  select agency_id into owner_agency from public.profiles where id=new.owner_id and active is true;
  if owner_agency is null then return new; end if;
  if new.agency_id is not null and new.agency_id <> owner_agency then return new; end if;
  select reference into property_ref from public.properties where id=new.property_id;
  insert into public.notifications(user_id,type,title,body,href)
  values(new.owner_id,'lead',
    'Novo pedido: ' || new.name,
    concat_ws(E'\n', 'Contacto: ' || new.contact, case when new.email is distinct from new.contact then new.email end,
      'Origem: ' || coalesce(new.sub_source,new.source::text),
      case when property_ref is not null then 'Imóvel: ' || property_ref end,
      case when new.sub_source='Calculadora de mais-valias' then 'Relatório de simulação guardado. Abrir o pedido para analisar e responder.' else left(new.message,400) end),
    '/app/leads/' || new.id::text);
  return new;
end;
$$;
revoke all on function helix_private.notify_saved_lead() from public,anon,authenticated;
drop trigger if exists notify_saved_lead on public.leads;
create trigger notify_saved_lead after insert on public.leads
for each row execute function helix_private.notify_saved_lead();
