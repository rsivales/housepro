-- Protect immutable accounting amounts. Existing table grants and RLS policies are unchanged.
create or replace function helix_private.guard_closed_payout() returns trigger
language plpgsql set search_path='' as $$
declare linked uuid;
begin
 if TG_OP='DELETE' then linked:=old.closure_id; else linked:=new.closure_id; end if;
 if linked is not null and auth.role() in('anon','authenticated') and pg_trigger_depth()<2 then
  if TG_OP in('INSERT','DELETE') then raise exception 'Os movimentos do fecho só podem ser gerados ou estornados pelo negócio.'; end if;
  if to_jsonb(new)-array['status','paid_at'] is distinct from to_jsonb(old)-array['status','paid_at'] then raise exception 'Os valores de um fecho financeiro são imutáveis. Reabra o negócio para regularizar.'; end if;
  if new.status is distinct from old.status and not ((old.status='pendente' and new.status='processado') or (old.status='processado' and new.status='pago')) then raise exception 'Transição de pagamento inválida.'; end if;
 end if;
 if TG_OP='DELETE' then return old; end if;return new;
end;$$;
revoke all on function helix_private.guard_closed_payout() from public,anon,authenticated;
create trigger guard_closed_payout before insert or update or delete on public.payouts for each row execute function helix_private.guard_closed_payout();
