begin;
do $$ declare earlier record; rejected boolean:=false; begin
 for earlier in select c.deal_id from public.deal_financial_closures c
 where c.status='posted' and exists(
  select 1 from public.deal_financial_closures n cross join lateral jsonb_array_elements(n.snapshot->'financials'->'producers')np
  where n.status='posted' and n.closed_at>c.closed_at and np->>'id' in(select p->>'id' from jsonb_array_elements(c.snapshot->'financials'->'producers')p)
 ) limit 1 loop
  begin update public.deals set stage='escritura' where id=earlier.deal_id;
  exception when others then if SQLERRM like 'Regularize os fechos posteriores%' then rejected:=true;else raise;end if;end;
  if not rejected then raise exception 'An older financial closure was reopened ahead of dependent closures';end if;
 end loop;
end $$;
rollback;
