-- Preserve billing order even when multiple historical closures were posted in one transaction.
create or replace function helix_private.sync_deal_finances() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.deal_financial_closures%rowtype; p jsonb;
begin
 if TG_OP='UPDATE' and old.stage::text='concluido' and new.stage::text='concluido' then
  if (to_jsonb(new)-array['updated_at','buyer_name','seller_name','buyer_user_id','seller_user_id','buyer_contact_id','credit_stage']) is distinct from (to_jsonb(old)-array['updated_at','buyer_name','seller_name','buyer_user_id','seller_user_id','buyer_contact_id','credit_stage']) then
   raise exception 'Reabra o negócio antes de alterar os dados financeiros de um fecho registado.';
  end if;
 end if;
 if new.stage::text='concluido' then perform helix_private.post_deal_finances(new.id);
 elsif TG_OP='UPDATE' and old.stage::text='concluido' then
  select * into c from public.deal_financial_closures where deal_id=new.id and status='posted' for update;
  if found then
   if exists(select 1 from public.payouts where closure_id=c.id and status='pago') then raise exception 'O fecho tem pagamentos marcados como pagos. É necessário um acerto financeiro antes de reabrir.'; end if;
   if exists(select 1 from public.deal_financial_closures later cross join lateral jsonb_array_elements(later.snapshot->'financials'->'producers')pr where later.status='posted' and later.id<>c.id and exists(
    select 1 from jsonb_array_elements(c.snapshot->'financials'->'producers')x where x->>'id'=pr->>'id' and
    (later.closed_at>c.closed_at or later.posted_at>c.posted_at or (pr->>'priorFaturacao')::numeric >= (x->>'priorFaturacao')::numeric+(x->>'commissionBase')::numeric)
   )) then raise exception 'Regularize os fechos posteriores destes consultores antes de reabrir este negócio.'; end if;
   for p in select value from jsonb_array_elements(c.snapshot->'financials'->'producers') loop
    update public.profiles set monthly_gross=greatest(0,coalesce(monthly_gross,0)-(p->>'commissionBase')::numeric) where id=(p->>'id')::uuid;
   end loop;
   update public.payouts set status='anulado' where closure_id=c.id;
   update public.deal_financial_closures set status='reversed',reversed_at=now() where id=c.id;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function helix_private.sync_deal_finances() from public,anon,authenticated;
