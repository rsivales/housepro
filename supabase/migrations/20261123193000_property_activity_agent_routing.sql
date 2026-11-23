-- Preserve the recording actor, but route the buyer lead and visit to the confirmed buyer consultant.
create or replace function public.save_property_activity(
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
  and coalesce(l.assigned_agent_id,l.owner_id)=coalesce(agent,p_actor) and l.status::text<>'perdido' order by l.created_at desc limit 1 for update;
 if lead is null then
  insert into public.leads(property_id,owner_id,assigned_agent_id,agency_id,name,contact,email,source,status,intent,
   sub_source,contact_id,pipeline,stage,interaction_only,message)
  values(p_property,p_actor,coalesce(agent,p_actor),actor.agency_id,p_data->>'name',coalesce(nullif(p_data->>'phone',''),nullif(p_data->>'email','')),nullif(p_data->>'email',''),
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
  values(coalesce(agent,p_actor),contact,p_data->>'name',p_property,p.reference,'visita',(p_data->>'occurredAt')::timestamptz,null,'feita',concat_ws(E'\n',p_data->>'feedback',case when coalesce((p_data->>'timeKnown')::boolean,false) is false then 'Hora não indicada na ficha.' end))
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
