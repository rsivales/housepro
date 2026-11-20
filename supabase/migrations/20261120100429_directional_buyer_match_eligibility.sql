-- Distinct minimum criteria for each side of the network match.
create or replace function public.can_read_buyer_match(p_match uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.buyer_matches m
 join public.contacts c on c.id=m.contact_id and c.owner_id=m.buyer_agent_id
 join public.properties p on p.id=m.property_id and p.agent_id=m.property_agent_id
 join public.profiles actor on actor.id=auth.uid() and actor.active
 where m.id=p_match and m.active and auth.uid() in(m.buyer_agent_id,m.property_agent_id)
 and p.approval='aprovado' and p.listing_state='activo' and not p.off_market
 and coalesce(p.status::text,'') not in('vendido','arrendado','cpcv')
 and c.type in('comprador','investidor')
 and ((auth.uid()=m.buyer_agent_id and coalesce(m.summary->>'buyerEligible','false')='true')
   or (auth.uid()=m.property_agent_id and coalesce(m.summary->>'propertyEligible','false')='true'))
 and coalesce(c.buyer_profile->>'active','true')='true');
$$;
select cron.schedule('housepro-buyer-matches','*/10 * * * *',$job$
 select net.http_post(url:='https://housepro.pt/api/cron/matches',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000)
 from helix_private.match_worker where id and enabled;
$job$);
