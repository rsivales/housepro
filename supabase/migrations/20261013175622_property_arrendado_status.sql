-- Commercial labels must be accepted by the persisted property status enum.
alter type public.property_status add value if not exists 'arrendado';
-- This existing UI state was missing from the live enum.
alter type public.property_status add value if not exists 'cpcv';

create or replace function public.portfolio_state(p_approval text,p_listing text,p_off boolean,p_status text)
returns text language sql immutable set search_path='' as $$
 select case when coalesce(p_approval,'rascunho')<>'aprovado' then coalesce(p_approval,'rascunho') when p_off then 'off_market' when p_listing<>'activo' then p_listing when p_status in ('reservado','cpcv','vendido','arrendado') then p_status else 'activo' end;
$$;

-- Keep the existing scoped authorization; closed rentals cannot be reactivated.
create or replace function public.portfolio_action(p_actor uuid,p_ids uuid[],p_action text,p_reason text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare pid uuid; p public.properties; n int=0; actor_name text; kind text;
begin
 if p_action not in ('approve','reject','activate','deactivate','submit') or cardinality(p_ids) not between 1 and 100 then raise exception 'invalid_action'; end if;
 if p_action='reject' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required'; end if;
 kind=case when p_action in ('approve','reject') then 'approve' else 'edit' end;
 select name into actor_name from public.profiles where id=p_actor;
 perform set_config('helix.actor_id',p_actor::text,true);
 foreach pid in array p_ids loop
  select * into p from public.properties where id=pid for update;
  if not found or not public.portfolio_allowed(p_actor,pid,kind) then raise exception 'forbidden'; end if;
  if p_action in ('approve','reject') and p.approval not in ('pendente','rejeitado') then raise exception 'not_pending'; end if;
  if p_action='activate' and (p.approval<>'aprovado' or p.status::text in ('vendido','arrendado','cpcv')) then raise exception 'approval_required'; end if;
  if p_action='submit' and p.approval='aprovado' then raise exception 'already_approved'; end if;
  update public.properties set
   status=case when p_action in ('submit','approve') and status::text='rascunho' then 'novo'::public.property_status else status end,
   approval=case when p_action='approve' then 'aprovado' when p_action='reject' then 'rejeitado' when p_action='submit' then 'pendente' else approval end,
   approved_by=case when p_action in ('approve','reject') then p_actor else approved_by end,
   rejection_reason=case when p_action='reject' then trim(p_reason) when p_action in ('approve','submit') then null else rejection_reason end,
   submitted_at=case when p_action='submit' then now() else submitted_at end,
   listing_state=case when p_action in ('activate','submit') then 'activo' when p_action='deactivate' then 'inactivo' else listing_state end
  where id=pid;
  insert into public.property_audit(property_id,property_ref,actor_id,actor_name,actor_role,action,changes) values(pid,p.reference,p_actor,actor_name,'helix',p_action,jsonb_build_array(jsonb_build_object('field','Publicação','from',public.portfolio_state(p.approval::text,p.listing_state,p.off_market,p.status::text),'to',p_action,'reason',p_reason)));
  n=n+1;
 end loop;
 return jsonb_build_object('count',n);
end; $$;
