-- Alert the broker on a submitted ancillary commission and the consultant on its decision.
create or replace function helix_private.notify_other_income() returns trigger
language plpgsql security definer set search_path='' as $$
declare broker uuid;
begin
 if TG_OP='INSERT' then
  select s.broker_id into broker from public.agency_finance_settings s
  join public.profiles p on p.id=s.broker_id and p.active
  where s.agency_id=new.agency_id;
  if broker is not null then
   insert into public.notifications(user_id,type,title,body,amount,href)
   values(broker,'comissao','Comissão de parceria por validar',new.partner_name||' · '||new.description,new.gross_amount,'/app/broker/rendimentos?agency='||new.agency_id);
  end if;
 elsif new.status is distinct from old.status then
  insert into public.notifications(user_id,type,title,body,amount,href)
  values(new.consultant_id,'comissao',case new.status when 'aprovado' then 'Comissão de parceria validada' when 'pago' then 'Comissão de parceria marcada como paga' else 'Comissão de parceria recusada' end,
    new.partner_name||' · '||new.description,case when new.status in('aprovado','pago') then new.consultant_amount else null end,'/app/rendimentos');
 end if;
 return new;
end;$$;
revoke all on function helix_private.notify_other_income() from public,anon,authenticated;
create trigger notify_other_income after insert or update of status on public.consultant_other_income
for each row execute function helix_private.notify_other_income();
