-- Non-destructive correction: retain every historical event and flag overlapping
-- imported observations so they do not inflate the KPI.
alter table public.property_engagement add column kpi_excluded boolean not null default false;
-- Existing analytics already recorded most historical clicks. Keep one imported
-- event per property/session bucket only when no native engagement exists.
with imported as (
 select e.property_id,e.kind,e.dedupe_key,e.created_at,
 row_number() over(partition by e.property_id,e.kind,floor(extract(epoch from e.created_at)/1800) order by e.created_at,e.dedupe_key) n
 from public.property_engagement e join public.leads l on l.id=e.dedupe_key and l.interaction_only
) update public.property_engagement e set kpi_excluded=true from imported i
where e.property_id=i.property_id and e.kind=i.kind and e.dedupe_key=i.dedupe_key
and (i.n>1 or exists(select 1 from public.property_engagement other
 where other.property_id=i.property_id and other.kind=i.kind
 and floor(extract(epoch from other.created_at)/1800)=floor(extract(epoch from i.created_at)/1800)
 and not exists(select 1 from public.leads l where l.id=other.dedupe_key)));

create or replace function public.save_contact_identity(p_actor uuid,p_data jsonb,p_lead uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare l public.leads%rowtype; c public.contacts%rowtype; a public.profiles%rowtype;
 nm text; ph text; em text; z text; typ text; ids uuid[]; created boolean:=false; linked boolean:=false; details text; lockkey bigint;
begin
 select * into a from public.profiles where id=p_actor and active=true;
 if a.id is null then raise exception 'forbidden' using errcode='42501'; end if;
 if p_lead is not null then
  select * into l from public.leads where id=p_lead for update;
  if l.id is null or l.interaction_only or coalesce(l.assigned_agent_id,l.owner_id) is distinct from p_actor then raise exception 'lead_forbidden' using errcode='42501'; end if;
 end if;
 nm:=trim(coalesce(nullif(p_data->>'name',''),l.name,''));
 ph:=nullif(trim(coalesce(nullif(p_data->>'phone',''),case when l.contact ~ '^[+0-9 ().-]+$' then l.contact end,'')),'');
 em:=lower(nullif(trim(coalesce(nullif(p_data->>'email',''),l.email,case when l.contact like '%@%' then l.contact end,'')),''));
 z:=nullif(trim(coalesce(nullif(p_data->>'zone',''),l.zone,'')),'');
 typ:=coalesce(nullif(p_data->>'type',''),case when l.pipeline='proprietarios' or l.property_type is not null or l.sub_source ilike '%avalia%' then 'vendedor' else 'comprador' end);
 if nm='' or length(nm)>160 or typ not in ('comprador','vendedor','investidor','recrutamento','fornecedor','outro') then raise exception 'invalid_contact'; end if;
 if em is not null and em !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 -- Sorted locks avoid deadlocks when the same phone/email arrive concurrently.
 for lockkey in select distinct hashtextextended(k,0) from unnest(array['email:'||em,'phone:'||public.contact_phone_key(ph)]) k where k is not null order by 1 loop perform pg_advisory_xact_lock(lockkey); end loop;
 select array_agg(id order by created_at,id) into ids from public.contacts where
 (em is not null and lower(trim(email))=em) or (ph is not null and public.contact_phone_key(phone)=public.contact_phone_key(ph)) or (l.contact_id is not null and id=l.contact_id);
 if cardinality(ids)>1 then return jsonb_build_object('conflict',true,'error','Telefone e email correspondem a fichas diferentes. Peça revisão à agência; nenhuma ficha foi alterada.'); end if;
 if cardinality(ids)=1 then
  select * into c from public.contacts where id=ids[1] for update;
  if c.owner_id is not null and c.owner_id<>p_actor then return jsonb_build_object('conflict',true,'error','Este contacto já existe e está atribuído a outro consultor. Solicite à agência a associação, sem duplicar a ficha.'); end if;
  -- Manual duplicate entry warns; converting a lead deliberately reuses the record.
  if p_lead is null then return jsonb_build_object('exists',true,'contact',to_jsonb(c)); end if;
  update public.contacts set owner_id=coalesce(owner_id,p_actor),agency_id=coalesce(agency_id,a.agency_id),phone=coalesce(nullif(phone,''),ph),email=coalesce(nullif(email,''),em),zone=coalesce(nullif(zone,''),z),buyer_profile=case when p_data ? 'buyerProfile' then p_data->'buyerProfile' else buyer_profile end,updated_at=now() where id=c.id returning * into c;
 else
  insert into public.contacts(name,phone,email,type,owner_id,agency_id,zone,budget,language,source,nif,id_document,address,buyer_profile)
  values(nm,ph,em,typ,p_actor,a.agency_id,z,p_data->>'budget',p_data->>'language',coalesce(l.sub_source,l.source::text,p_data->>'source','manual'),p_data->>'nif',p_data->>'idDocument',p_data->>'address',coalesce(p_data->'buyerProfile','{}'::jsonb)) returning * into c;
  created:=true;
 end if;
 if p_lead is not null then
  linked:=l.contact_id is null;
  update public.leads set contact_id=c.id where id=l.id;
  if not exists(select 1 from public.contact_activities where contact_id=c.id and lead_id=l.id and type='lead_import') then
   details:=concat_ws(E'\n',l.message,'Origem: '||l.source::text||coalesce(' · '||l.sub_source,''),'Página: '||l.page_url,'Versão: '||l.form_version,'Localização: '||l.zone,'Tipo de imóvel: '||l.property_type,'Estado: '||l.property_condition,'Motivo: '||l.evaluation_reason,'Prazo: '||l.sell_timeframe,'Preferência: '||l.contact_preference,'Horário: '||l.best_time,'Campanha: '||l.campaign_id::text,'UTM: '||l.utm::text,'Consentimento: '||l.consent::text,(select string_agg(coalesce(label,question_key)||': '||value,E'\n' order by created_at,id) from public.lead_answers where lead_id=l.id));
   insert into public.contact_activities(contact_id,type,title,body,actor_id,actor_name,lead_id) values(c.id,'lead_import','Informação completa do pedido do website',details,p_actor,a.name,l.id);
  end if;
 end if;
 return jsonb_build_object('contact',to_jsonb(c),'exists',not created,'linked',linked);
end $$;

create or replace function public.capture_property_lead(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := case when payload->>'kind' = 'personalized' then 'personalized' else 'alert' end;
  v_email text := lower(trim(payload->>'email'));
  v_name text := trim(coalesce(payload->>'name', ''));
  v_phone text := trim(coalesce(payload->>'phone', ''));
  v_zone text := trim(coalesce(payload#>>'{criteria,zone}', payload#>>'{criteria,location}', ''));
  v_sub_source text := case when v_kind = 'personalized' then 'Imóveis — Pesquisa personalizada' else 'Imóveis — Alerta de pesquisa' end;
  v_agency uuid;
  v_agent uuid;
  v_broker uuid;
  v_last uuid;
  v_lead uuid;
  v_message text;
  v_updated boolean := false;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce((payload->>'consent')::boolean, false) is not true
     or (v_kind = 'personalized' and (v_name = '' or not public.lead_is_identified(v_phone,null) or v_phone !~ '^[+0-9 ().-]+$')) then
    raise exception 'invalid_fields' using errcode = '22023';
  end if;

  -- Prefer an agency whose configured region matches the requested municipality.
  select a.id into v_agency
  from agencies a
  where exists (select 1 from profiles p where p.agency_id=a.id and p.active=true and p.role_key in ('agente','agente_ami'))
    and v_zone <> ''
    and (lower(a.region)=lower(v_zone) or lower(a.region) like '%'||lower(v_zone)||'%' or lower(v_zone) like '%'||lower(a.region)||'%')
  order by a.created_at, a.id limit 1;

  -- Never discard the lead: if no municipality is configured, use the oldest active agency pool.
  if v_agency is null then
    select a.id into v_agency from agencies a
    where exists (select 1 from profiles p where p.agency_id=a.id and p.active=true and p.role_key in ('agente','agente_ami'))
    order by a.created_at, a.id limit 1;
  end if;

  if v_agency is not null then
    insert into lead_routing_state(agency_id) values (v_agency) on conflict do nothing;
    select last_agent_id into v_last from lead_routing_state where agency_id=v_agency for update;
    select p.id into v_agent from profiles p
    where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami')
      and (v_last is null or (p.created_at,p.id) > (select q.created_at,q.id from profiles q where q.id=v_last))
    order by p.created_at,p.id limit 1;
    if v_agent is null then
      select p.id into v_agent from profiles p where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami') order by p.created_at,p.id limit 1;
    end if;
    update lead_routing_state set last_agent_id=v_agent,updated_at=now() where agency_id=v_agency;
    select p.id into v_broker from profiles p where p.agency_id=v_agency and p.active=true and p.role_key in ('diretor','admin') order by p.created_at limit 1;
  end if;

  v_message := jsonb_build_object(
    'criteria',coalesce(payload->'criteria','{}'::jsonb),
    'details',coalesce(payload->>'details',''),
    'contactPreference',coalesce(payload->>'contactPreference',''),
    'operationalConsent',true
  )::text;

  select id into v_lead from leads where lower(email)=v_email and sub_source=v_sub_source and status <> 'perdido' order by created_at desc limit 1;
  if v_lead is null then
    insert into leads(owner_id,assigned_agent_id,agency_id,name,contact,email,message,source,status,intent,sub_source,page_url,referrer_url,utm,marketing_consent,zone,budget,consent,unassigned)
    values(v_agent,v_agent,v_agency,case when v_kind='personalized' then v_name else 'Alerta de pesquisa' end,coalesce(nullif(v_phone,''),v_email),v_email,v_message,'site','novo','mensagem',v_sub_source,left(coalesce(payload->>'pageUrl',''),500),left(coalesce(payload->>'referrerUrl',''),500),coalesce(payload->'utm','{}'::jsonb),coalesce((payload->>'marketingConsent')::boolean,false),nullif(v_zone,''),payload#>>'{criteria,budget}',jsonb_build_object('base',true,'at',now()),v_agent is null)
    returning id into v_lead;
  else
    update leads set owner_id=v_agent,assigned_agent_id=v_agent,agency_id=v_agency,name=case when v_kind='personalized' then v_name else name end,contact=coalesce(nullif(v_phone,''),v_email),message=v_message,page_url=left(coalesce(payload->>'pageUrl',''),500),referrer_url=left(coalesce(payload->>'referrerUrl',''),500),utm=coalesce(payload->'utm','{}'::jsonb),marketing_consent=coalesce((payload->>'marketingConsent')::boolean,false),zone=nullif(v_zone,''),budget=payload#>>'{criteria,budget}',updated_at=now(),unassigned=v_agent is null where id=v_lead;
    v_updated := true;
  end if;

  insert into lead_routing_events(lead_id,agency_id,agent_id,broker_id,zone,reason)
  values(v_lead,v_agency,v_agent,v_broker,nullif(v_zone,''),case when v_agent is null then 'Sem consultor elegível; aguarda broker' else 'Zona + round-robin de consultores ativos' end);
  insert into lead_activities(lead_id,type,note,to_val) values(v_lead,'assigned','Distribuição automática do website',v_agent::text);
  return jsonb_build_object('ok',true,'id',v_lead,'updated',v_updated,'assigned',v_agent is not null);
end $$;


create or replace function public.portfolio_list(p_actor uuid,p_scope text default 'mine') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; caps jsonb;
begin
 caps=public.portfolio_caps(p_actor);
 if p_scope not in ('mine','agency') then raise exception 'invalid_scope'; end if;
 if p_scope='agency' and not (caps->>'viewAgency')::boolean then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(item order by created_at desc,id),'[]'::jsonb) into result from (
  select p.created_at,p.id,jsonb_build_object('id',p.id,'reference',p.reference,'title',p.title,'image',p.cover_url,'municipality',p.municipality,'typology',p.typology,'price',p.price,'area',p.area,'areaUtil',p.area_util,'beds',p.beds,'baths',p.baths,'agentId',p.agent_id,'agentName',a.name,'agencyId',a.agency_id,'agencyName',ag.name,'approval',p.approval,'listingState',p.listing_state,'status',p.status,'state',public.portfolio_state(p.approval::text,p.listing_state,p.off_market,p.status::text),'stateSince',p.portfolio_state_since,'listedAt',p.listed_at,'developmentName',p.development_name,'isDevelopment',p.is_development,'unitLabel',p.unit_label,'documentKinds',p.document_kinds,'documents',coalesce((select jsonb_agg(d->>'kind') from jsonb_array_elements(coalesce(p.documents_meta,'[]'::jsonb)) d where nullif(d->>'url','') is not null),'[]'::jsonb),'sellerType',p.seller_type,'licenseEndorsed',p.license_endorsed,'rejectionReason',p.rejection_reason,'signaturePending',p.is_signature and p.signature_status in ('candidate','pending'),'views',(select count(*) from public.property_engagement e where e.property_id=p.id and e.kind='view'),'contactClicks',(select count(*) from public.property_engagement e where e.property_id=p.id and e.kind='contact' and not e.kpi_excluded),'leads',(select count(*) from public.leads l where l.property_id=p.id and not l.interaction_only),'priceDrops',coalesce((select jsonb_agg(x) from (select old_price as "from",new_price as "to",created_at as "at" from public.property_price_history h where h.property_id=p.id and new_price<old_price order by created_at desc limit 3) x),'[]'::jsonb),'dropCount',(select count(*) from public.property_price_history h where h.property_id=p.id and new_price<old_price),'canEdit',public.portfolio_allowed(p_actor,p.id,'edit'),'canDuplicate',public.portfolio_allowed(p_actor,p.id,'duplicate'),'canApprove',public.portfolio_allowed(p_actor,p.id,'approve')) as item
  from public.properties p join public.profiles a on a.id=p.agent_id left join public.agencies ag on ag.id=a.agency_id
  where public.portfolio_allowed(p_actor,p.id,'read') and (p_scope='agency' or p.agent_id=p_actor or p_actor=any(coalesce(p.co_agent_ids,'{}'::uuid[])))
 ) q;
 return jsonb_build_object('items',result,'capabilities',caps,'trackingSince',(select tracking_since from public.property_portfolio_meta where id=true));
end; $$;
