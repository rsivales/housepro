create table public.property_activity_intakes (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.properties(id),
 agency_id uuid not null references public.agencies(id),
 actor_id uuid not null references public.profiles(id),
 listing_agent_id uuid not null references public.profiles(id),
 buyer_agent_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('visit','proposal')),
 occurred_at timestamptz not null,
 source text not null check(source in ('unknown','site','portal','facebook','whatsapp','consultor')),
 origin_detail text,
 sentiment text not null check(sentiment in ('positive','neutral','negative','unspecified')),
 rating integer check(rating between 1 and 5),
 amount numeric,
 owner_feedback text,
 share_owner boolean not null default false,
 data jsonb not null,
 document_path text not null,
 document_name text not null,
 document_mime text not null,
 document_hash text not null,
 contact_id uuid not null references public.contacts(id),
 lead_id uuid references public.leads(id),
 visit_id uuid references public.visits(id),
 deal_id uuid references public.deals(id),
 confirmed_at timestamptz not null default now(),
 unique(property_id,document_hash)
);
alter table public.property_activity_intakes enable row level security;
revoke all on public.property_activity_intakes from public,anon,authenticated;
grant all on public.property_activity_intakes to service_role;
create index property_activity_period_idx on public.property_activity_intakes(agency_id,occurred_at);
create index property_activity_property_idx on public.property_activity_intakes(property_id,occurred_at);
create index property_activity_contact_idx on public.property_activity_intakes(contact_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('property-activity-private','property-activity-private',false,4194304,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create function public.save_property_activity(
 p_actor uuid,p_property uuid,p_data jsonb,p_path text,p_name text,p_mime text,p_hash text
) returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
 p public.properties%rowtype; actor public.profiles%rowtype; existing public.property_activity_intakes%rowtype;
 identity jsonb; contact uuid; lead uuid; visit uuid; deal uuid; activity uuid:=gen_random_uuid();
 stage_index integer; stage_count integer; pipeline_key text; participant jsonb; agent uuid;
 current_stage public.deal_stage;
begin
 if not public.portfolio_allowed(p_actor,p_property,'edit') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into p from public.properties where id=p_property for update;
 select * into actor from public.profiles where id=p_actor and active;
 if actor.id is null then raise exception 'forbidden'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_property::text||p_hash,0));
 select * into existing from public.property_activity_intakes where property_id=p_property and document_hash=p_hash;
 if found then
  if existing.data<>p_data then raise exception 'document_already_recorded'; end if;
  return jsonb_build_object('id',existing.id,'contactId',existing.contact_id,'leadId',existing.lead_id,'visitId',existing.visit_id,'dealId',existing.deal_id,'exists',true);
 end if;
 if p_data->>'kind' not in ('visit','proposal') or coalesce((p_data->>'confirmed')::boolean,false) is not true then raise exception 'review_required'; end if;
 pipeline_key:=p_data->>'pipeline'; stage_index:=(p_data->>'stage')::integer;
 if pipeline_key='compradores' then stage_count:=6;
 elsif pipeline_key='proprietarios' then stage_count:=5;
 elsif pipeline_key like 'custom:%' then
  select cardinality(stages) into stage_count from public.crm_lead_pipelines where id=substring(pipeline_key from 8)::uuid and agency_id=actor.agency_id;
 end if;
 if stage_count is null or stage_index<0 or stage_index>=stage_count then raise exception 'invalid_pipeline'; end if;
 agent:=nullif(p_data->>'buyerAgentId','')::uuid;
 if agent is not null and not exists(select 1 from public.profiles where id=agent and active and agency_id=actor.agency_id) then raise exception 'invalid_agent'; end if;
 for participant in select * from jsonb_array_elements(p_data->'participants') loop
  if nullif(participant->>'profileId','') is not null and not exists(
   select 1 from public.profiles where id=(participant->>'profileId')::uuid and active and agency_id=actor.agency_id
  ) then raise exception 'invalid_agent'; end if;
 end loop;
 identity:=public.save_contact_identity(p_actor,jsonb_build_object(
  'name',p_data->>'name','phone',p_data->>'phone','email',p_data->>'email','type','comprador',
  'source',p_data->>'source','nif',p_data->>'nif','address',p_data->>'address'
 ));
 if coalesce((identity->>'conflict')::boolean,false) then raise exception '%',identity->>'error'; end if;
 contact:=(identity#>>'{contact,id}')::uuid;
 select l.id into lead from public.leads l where l.property_id=p_property and l.contact_id=contact
  and coalesce(l.assigned_agent_id,l.owner_id)=p_actor and l.status::text<>'perdido' order by l.created_at desc limit 1 for update;
 if lead is null then
  insert into public.leads(property_id,owner_id,assigned_agent_id,agency_id,name,contact,email,source,status,intent,
   sub_source,contact_id,pipeline,stage,interaction_only,message)
  values(p_property,p_actor,p_actor,actor.agency_id,p_data->>'name',p_data->>'phone',nullif(p_data->>'email',''),
   (case when p_data->>'source'='unknown' then 'consultor' else p_data->>'source' end)::public.lead_source,'novo','mensagem',
   case when p_data->>'kind'='visit' then 'Ficha de visita — documento' else 'Proposta — documento' end,
   contact,pipeline_key,stage_index,false,'Informação revista a partir de documento. Consultar histórico do imóvel.')
  returning id into lead;
 else
  update public.leads set stage=greatest(coalesce(stage,0),stage_index),updated_at=now()
  where id=lead and pipeline=pipeline_key;
 end if;
 if p_data->>'kind'='visit' then
  insert into public.visits(owner_id,contact_id,contact_name,property_id,property_ref,kind,at,duration_min,status,note)
  values(p_actor,contact,p_data->>'name',p_property,p.reference,'visita',(p_data->>'occurredAt')::timestamptz,null,'feita',concat_ws(E'\n',p_data->>'feedback',case when coalesce((p_data->>'timeKnown')::boolean,false) is false then 'Hora não indicada na ficha.' end))
  returning id into visit;
 else
  select id,stage into deal,current_stage from public.deals where property_id=p_property and buyer_contact_id=contact
   and stage not in ('concluido','cancelado') order by created_at desc limit 1 for update;
  if deal is null then
   insert into public.deals(property_id,agency_id,buyer_name,buyer_contact_id,seller_name,angariador_id,
    consultor_comprador_id,amount,commission_type,commission_pct,commission_fixed,stage,created_at)
   values(p_property,(select agency_id from public.profiles where id=p.agent_id),p_data->>'name',contact,p.owner_name,p.agent_id,
    coalesce(agent,p_actor),(p_data->>'amount')::numeric,coalesce(p.commission_type,'percent'),p.commission_pct,p.commission_fixed,'proposta_enviada',(p_data->>'occurredAt')::timestamptz)
   returning id into deal;
   insert into public.deal_events(deal_id,track,to_stage,actor_id,note,created_at)
   values(deal,'transacional','proposta_enviada',p_actor,'Proposta revista e registada a partir de documento.',(p_data->>'occurredAt')::timestamptz);
  else
   insert into public.deal_events(deal_id,track,to_stage,actor_id,note)
   values(deal,'documento',current_stage::text,p_actor,'Nova ficha de proposta no histórico do imóvel. Condições anteriores mantidas no processo; consultar a ficha revista.');
  end if;
  for participant in select * from jsonb_array_elements(p_data->'participants') loop
   if nullif(participant->>'profileId','') is not null then
    insert into public.deal_participants(deal_id,profile_id,role_in_deal)
    values(deal,(participant->>'profileId')::uuid,participant->>'role') on conflict do nothing;
   end if;
  end loop;
 end if;
 insert into public.property_activity_intakes(id,property_id,agency_id,actor_id,listing_agent_id,buyer_agent_id,kind,occurred_at,source,origin_detail,
  sentiment,rating,amount,owner_feedback,share_owner,data,document_path,document_name,document_mime,document_hash,contact_id,lead_id,visit_id,deal_id)
 values(activity,p_property,(select agency_id from public.profiles where id=p.agent_id),p_actor,p.agent_id,coalesce(agent,p_actor),p_data->>'kind',(p_data->>'occurredAt')::timestamptz,
  p_data->>'source',p_data->>'originDetail',p_data->>'sentiment',nullif(p_data->>'rating','')::integer,
  case when p_data->>'kind'='proposal' then (p_data->>'amount')::numeric end,p_data->>'ownerFeedback',(p_data->>'shareOwner')::boolean,
  p_data,p_path,p_name,p_mime,p_hash,contact,lead,visit,deal);
 insert into public.property_documents(property_id,kind,url,validated)
 values(p_property,case when p_data->>'kind'='visit' then 'Ficha de visita' else 'Proposta' end,
  '/api/property-activity/document?id='||activity::text,true);
 insert into public.property_audit(property_id,property_ref,actor_id,actor_name,actor_role,action,changes)
 values(p_property,p.reference,p_actor,actor.name,actor.role::text,'documento',
  jsonb_build_array(jsonb_build_object('field','documento','from',null,'to',case when visit is not null then 'Ficha de visita revista' else 'Proposta revista' end)));
 insert into public.contact_activities(contact_id,type,title,body,actor_id,actor_name,property_ref,lead_id)
 values(contact,case when visit is not null then 'visit' else 'deal' end,
  case when visit is not null then 'Ficha de visita revista' else 'Proposta revista' end,
  concat_ws(E'\n',p_data->>'feedback',p_data->>'conditions','Origem: '||(p_data->>'originDetail')),p_actor,actor.name,p.reference,lead);
 return jsonb_build_object('id',activity,'contactId',contact,'leadId',lead,'visitId',visit,'dealId',deal,'exists',false);
end;
$$;
revoke all on function public.save_property_activity(uuid,uuid,jsonb,text,text,text,text) from public,anon,authenticated;
grant execute on function public.save_property_activity(uuid,uuid,jsonb,text,text,text,text) to service_role;

create function public.property_activity_kpis(p_actor uuid,p_from timestamptz,p_until timestamptz)
returns jsonb language plpgsql set search_path='' as $$
declare a public.profiles; result jsonb;
begin
 select * into a from public.profiles where id=p_actor and active;
 if a.id is null or a.role_key not in ('superadmin','admin','diretor','coordenador') then raise exception 'forbidden' using errcode='42501'; end if;
 p_from:=((p_from at time zone 'UTC')::date)::timestamp at time zone 'Europe/Lisbon';
 p_until:=((p_until at time zone 'UTC')::date)::timestamp at time zone 'Europe/Lisbon';
 if p_until<=p_from or p_until-p_from>interval '2 years' then raise exception 'invalid_period'; end if;
 with scoped as (
  select i.* from public.property_activity_intakes i where occurred_at>=p_from and occurred_at<p_until
   and (a.role_key='superadmin' or i.agency_id=a.agency_id)
 ), closed as (
  select distinct d.id,d.amount from public.deals d join public.deal_events e on e.deal_id=d.id
  where d.stage='concluido' and e.track='transacional' and e.to_stage='concluido' and e.created_at>=p_from and e.created_at<p_until
   and (a.role_key='superadmin' or d.agency_id=a.agency_id)
 )
 select jsonb_build_object(
  'visitForms',(select count(*) from scoped where kind='visit'),
  'proposalForms',(select count(*) from scoped where kind='proposal'),
  'visits',(select count(*) from public.visits v join public.profiles pr on pr.id=v.owner_id where v.status='feita' and v.at>=p_from and v.at<p_until and (a.role_key='superadmin' or pr.agency_id=a.agency_id)),
  'clients',(select count(distinct contact_id) from scoped),
  'averageRating',(select round(avg(rating),1) from scoped),
  'proposedAmount',(select coalesce(sum(amount),0) from scoped where kind='proposal'),
  'closedDeals',(select count(*) from closed),
  'closedAmount',(select coalesce(sum(amount),0) from closed),
  'sources',(select coalesce(jsonb_agg(row_to_json(s)),'[]') from(select source,count(distinct contact_id) as clients,count(*) as documents from scoped group by source order by source)s),
  'sentiment',(select coalesce(jsonb_agg(row_to_json(s)),'[]') from(select sentiment,count(*) as count from scoped group by sentiment)s),
  'properties',(select coalesce(jsonb_agg(row_to_json(s)),'[]') from(
   select p.reference,count(*) filter(where i.kind='visit') as visits,count(*) filter(where i.kind='proposal') as proposals,round(avg(i.rating),1) as rating
   from scoped i join public.properties p on p.id=i.property_id group by p.reference order by p.reference)s)
 ) into result;
 return result;
end;
$$;
revoke all on function public.property_activity_kpis(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.property_activity_kpis(uuid,timestamptz,timestamptz) to service_role;
