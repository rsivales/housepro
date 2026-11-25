-- Anonymous interactions are retained, never operational leads.
alter table public.leads add column interaction_only boolean not null default false;
create function public.contact_phone_key(v text) returns text language sql immutable parallel safe set search_path='' as $$
 select case when length(d)=9 then '351'||d when left(d,2)='00' then substring(d from 3) else nullif(d,'') end from (select regexp_replace(coalesce(v,''),'[^0-9]','','g') d) n;
$$;
create function public.lead_is_identified(c text,e text) returns boolean language sql immutable parallel safe set search_path='' as $$
 select coalesce(trim(e) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$',false)
 or coalesce(trim(c) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$',false)
 or (coalesce(trim(c) ~ '^[+0-9 ().-]+$',false) and length(public.contact_phone_key(c)) between 9 and 15);
$$;
create function public.classify_lead_identity() returns trigger language plpgsql set search_path='' as $$
begin new.interaction_only:=not public.lead_is_identified(new.contact,new.email); return new; end $$;
create trigger classify_lead_identity before insert or update of contact,email on public.leads for each row execute function public.classify_lead_identity();
update public.leads set interaction_only=not public.lead_is_identified(contact,email) where interaction_only is distinct from (not public.lead_is_identified(contact,email));
-- Use stable IDs for historical interactions; do not create fictional impressions.
insert into public.property_engagement(property_id,kind,dedupe_key,created_at)
select property_id,'contact',id,created_at from public.leads where interaction_only and property_id is not null on conflict do nothing;
-- Correct portfolio lead KPI without losing the historical records.
do $do$ declare d text; begin
 select pg_get_functiondef('public.portfolio_list(uuid,text)'::regprocedure) into d;
 d:=replace(d,'from public.leads l where l.property_id=p.id','from public.leads l where l.property_id=p.id and not l.interaction_only');
 execute d;
end $do$;
create unique index contacts_email_identity_unique on public.contacts(lower(trim(email))) where nullif(trim(email),'') is not null;
create unique index contacts_phone_identity_unique on public.contacts(public.contact_phone_key(phone)) where length(public.contact_phone_key(phone)) between 9 and 15;
-- This service-only RPC authorizes the actual actor, locks the lead, deduplicates
-- globally, and links the complete source record in the same transaction.
create function public.save_contact_identity(p_actor uuid,p_data jsonb,p_lead uuid default null) returns jsonb
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
  update public.contacts set owner_id=coalesce(owner_id,p_actor),agency_id=coalesce(agency_id,a.agency_id),phone=coalesce(nullif(phone,''),ph),email=coalesce(nullif(email,''),em),zone=coalesce(nullif(zone,''),z),updated_at=now() where id=c.id returning * into c;
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
revoke all on function public.save_contact_identity(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_contact_identity(uuid,jsonb,uuid) to service_role;
