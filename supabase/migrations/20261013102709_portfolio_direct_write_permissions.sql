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
 if TG_OP='INSERT' or public.portfolio_state(new.approval::text,new.listing_state,new.off_market,new.status::text) is distinct from public.portfolio_state(old.approval::text,old.listing_state,old.off_market,old.status::text) then new.portfolio_state_since=now(); end if;
 if TG_OP='UPDATE' and new.price is distinct from old.price then
  insert into public.property_price_history(property_id,old_price,new_price,actor_id) values(new.id,old.price,new.price,coalesce(auth.uid(),nullif(current_setting('helix.actor_id',true),'')::uuid));
 end if;
 return new;
end; $$;
revoke all on function helix_private.capture_portfolio_history() from public,anon,authenticated;
