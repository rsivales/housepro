-- Copying a permitted template is independent from editing its source.
create or replace function public.portfolio_allowed(p_actor uuid,p_property uuid,p_kind text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare a public.profiles; p public.properties; owner_agency uuid; own boolean; scope boolean; caps jsonb;
begin
 select * into a from public.profiles where id=p_actor and active is distinct from false; if not found then return false; end if;
 select * into p from public.properties where id=p_property; if not found then return false; end if;
 select agency_id into owner_agency from public.profiles where id=p.agent_id;
 caps=public.portfolio_caps(p_actor); own=p.agent_id=p_actor or p_actor=any(coalesce(p.co_agent_ids,'{}'::uuid[]));
 scope=(caps->>'global')::boolean or (a.agency_id is not null and a.agency_id=owner_agency);
 if p_kind='read' then return own or (scope and (caps->>'viewAgency')::boolean); end if;
 if p_kind='edit' then return own or (scope and (caps->>'viewAgency')::boolean and (caps->>'editAgency')::boolean); end if;
 if p_kind='duplicate' then return (caps->>'duplicate')::boolean and (own or (scope and (caps->>'viewAgency')::boolean)); end if;
 if p_kind='approve' then return (p.agent_id=p_actor and (caps->>'ownAMI')::boolean) or (scope and (caps->>'viewAgency')::boolean and (caps->>'approveAgency')::boolean); end if;
 return false;
end; $$;

-- A reservation does not reset the age of an active publication.
-- Enforce the portfolio publication permissions for legacy direct-client writes
-- too. The trigger is private and derives identity from the verified DB session.
create or replace function helix_private.capture_portfolio_history() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; caps jsonb;
begin
 if current_setting('role',true) in ('anon','authenticated') then
  actor=auth.uid();
  if actor is null then raise exception 'forbidden'; end if;
  caps=public.portfolio_caps(actor);
  if TG_OP='UPDATE' then
   if not public.portfolio_allowed(actor,old.id,'edit') then raise exception 'forbidden'; end if;
   if new.approval is distinct from old.approval and new.approval in ('aprovado','rejeitado') and not public.portfolio_allowed(actor,old.id,'approve') then raise exception 'forbidden_approval'; end if;
   if new.agent_id is distinct from old.agent_id then
    if not (caps->>'editAgency')::boolean or (not (caps->>'global')::boolean and not exists(select 1 from public.profiles target join public.profiles me on me.id=actor where target.id=new.agent_id and target.agency_id=me.agency_id)) then raise exception 'forbidden_assignment'; end if;
   end if;
  else
   if new.agent_id<>actor then raise exception 'forbidden_assignment'; end if;
   if new.approval='aprovado' and not ((caps->>'ownAMI')::boolean or (caps->>'approveAgency')::boolean) then raise exception 'forbidden_approval'; end if;
  end if;
 end if;
 if TG_OP='INSERT' or public.portfolio_state(new.approval::text,new.listing_state,new.off_market,case when new.status::text in ('vendido','cpcv') then 'vendido' else null end) is distinct from public.portfolio_state(old.approval::text,old.listing_state,old.off_market,case when old.status::text in ('vendido','cpcv') then 'vendido' else null end) then new.portfolio_state_since=now(); end if;
 if TG_OP='UPDATE' and new.price is distinct from old.price then
  insert into public.property_price_history(property_id,old_price,new_price,actor_id) values(new.id,old.price,new.price,coalesce(auth.uid(),nullif(current_setting('helix.actor_id',true),'')::uuid));
 end if;
 return new;
end; $$;
revoke all on function helix_private.capture_portfolio_history() from public,anon,authenticated;
