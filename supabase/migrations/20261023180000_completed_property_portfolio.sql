-- Preserve completed listings as public results. Existing approval, publication,
-- off-market and authorization rules remain unchanged.
-- Recover only dates supported by the recorded current portfolio transition.
update public.properties
set sold_at = (portfolio_state_since at time zone 'Europe/Lisbon')::date,
    price_visible = false
where status::text in ('vendido','arrendado') and sold_at is null
  and portfolio_state_since is not null;

create or replace function helix_private.record_property_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status::text in ('vendido','arrendado') then
    if TG_OP = 'INSERT' then
      new.sold_at := coalesce(new.sold_at, (now() at time zone 'Europe/Lisbon')::date);
    elsif new.status is distinct from old.status then
      new.sold_at := (now() at time zone 'Europe/Lisbon')::date;
    else
      new.sold_at := old.sold_at;
    end if;
    new.price_visible := false;
  elsif TG_OP = 'UPDATE' and old.status::text in ('vendido','arrendado') then
    new.sold_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists record_property_completion on public.properties;
create trigger record_property_completion before insert or update on public.properties
for each row execute function helix_private.record_property_completion();

-- Trigger-only privilege escalation permits inserting into each agency member's
-- private inbox after the original authorized property write has succeeded.
create or replace function helix_private.notify_property_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare producer_name text; producer_agency uuid; completion_kind text;
begin
  if new.status::text not in ('vendido','arrendado') or new.status is null then return new; end if;
  if TG_OP = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select name,agency_id into producer_name,producer_agency from public.profiles where id=new.agent_id;
  if producer_agency is null then return new; end if;
  completion_kind := case when new.status::text='vendido' then 'venda' else 'arrendamento' end;
  insert into public.notifications(user_id,type,title,body,href)
  select id,'property_completed',
    format('Parabéns, %s! %s!', coalesce(producer_name,'consultor'),case when completion_kind='venda' then 'Venda concretizada' else 'Arrendamento concretizado' end),
    format('Parabéns a %s %s do imóvel %s — %s! Os parabéns da equipa HousePro e votos de muitos mais sucessos!',coalesce(producer_name,'quem concretizou o negócio'),case when completion_kind='venda' then 'pela venda' else 'pelo arrendamento' end,new.reference,new.title),
    '/imovel/' || new.id::text
  from public.profiles where agency_id=producer_agency and active is true;
  return new;
end;
$$;
revoke all on function helix_private.notify_property_completion() from public,anon,authenticated;
revoke all on function helix_private.record_property_completion() from public,anon,authenticated;
drop trigger if exists notify_property_completion on public.properties;
create trigger notify_property_completion after insert or update of status on public.properties
for each row execute function helix_private.notify_property_completion();
