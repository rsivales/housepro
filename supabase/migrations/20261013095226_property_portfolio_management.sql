-- Private operational data: accessed only through authenticated, scoped server APIs.
create schema if not exists helix_private;
revoke all on schema helix_private from public, anon, authenticated;
alter table public.properties add column if not exists portfolio_state_since timestamptz;
alter table public.properties add column if not exists unit_label text;
alter table public.properties add column if not exists duplication_source_id uuid references public.properties(id) on delete set null;
alter table public.properties add column if not exists duplication_batch_id uuid;
create table public.property_portfolio_permissions(role_key text primary key, capabilities jsonb not null check(jsonb_typeof(capabilities)='object'), updated_at timestamptz not null default now());
create table public.property_duplication_batches(id uuid primary key, actor_id uuid not null, source_id uuid not null, fingerprint text not null, result jsonb not null, created_at timestamptz not null default now());
create table public.property_price_history(id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade, old_price numeric not null, new_price numeric not null, actor_id uuid, source_audit_id uuid unique, created_at timestamptz not null default now());
create index on public.property_price_history(property_id,created_at desc);
create index if not exists leads_property_portfolio_idx on public.leads(property_id);
create table public.property_engagement(property_id uuid not null references public.properties(id) on delete cascade, kind text not null check(kind in ('view','contact')), dedupe_key uuid not null, created_at timestamptz not null default now(), primary key(property_id,kind,dedupe_key));
create index on public.property_engagement(property_id,kind);
create table public.property_portfolio_meta(id boolean primary key default true check(id), tracking_since timestamptz not null default now());
insert into public.property_portfolio_meta(id) values(true);
alter table public.property_portfolio_permissions enable row level security;
alter table public.property_duplication_batches enable row level security;
alter table public.property_price_history enable row level security;
alter table public.property_engagement enable row level security;
alter table public.property_portfolio_meta enable row level security;
revoke all on public.property_portfolio_permissions,public.property_duplication_batches,public.property_price_history,public.property_engagement,public.property_portfolio_meta from anon,authenticated;
grant all on public.property_portfolio_permissions,public.property_duplication_batches,public.property_price_history,public.property_engagement,public.property_portfolio_meta to service_role;

create function public.portfolio_state(p_approval text,p_listing text,p_off boolean,p_status text) returns text language sql immutable set search_path='' as $$
 select case when coalesce(p_approval,'rascunho')<>'aprovado' then coalesce(p_approval,'rascunho') when p_off then 'off_market' when p_listing<>'activo' then p_listing when p_status in ('reservado','cpcv','vendido') then p_status else 'activo' end;
$$;
create function helix_private.capture_portfolio_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' or public.portfolio_state(new.approval::text,new.listing_state,new.off_market,new.status::text) is distinct from public.portfolio_state(old.approval::text,old.listing_state,old.off_market,old.status::text) then new.portfolio_state_since=now(); end if;
 if TG_OP='UPDATE' and new.price is distinct from old.price then
  insert into public.property_price_history(property_id,old_price,new_price,actor_id) values(new.id,old.price,new.price,coalesce(auth.uid(),nullif(current_setting('helix.actor_id',true),'')::uuid));
 end if;
 return new;
end; $$;
revoke all on function helix_private.capture_portfolio_history() from public,anon,authenticated;
create trigger capture_portfolio_history before insert or update on public.properties for each row execute function helix_private.capture_portfolio_history();
-- Recover only numeric price changes actually recorded by the existing edit API.
insert into public.property_price_history(property_id,old_price,new_price,actor_id,source_audit_id,created_at)
 select a.property_id,replace(regexp_replace(c->>'from','[^0-9,]','','g'),',','.')::numeric,replace(regexp_replace(c->>'to','[^0-9,]','','g'),',','.')::numeric,a.actor_id,a.id,a.created_at
 from public.property_audit a cross join lateral jsonb_array_elements(coalesce(a.changes,'[]')) c
 where c->>'field'='Preço' and c->>'from' ~ '[0-9]' and c->>'to' ~ '[0-9]' on conflict(source_audit_id) do nothing;

create function public.portfolio_caps(p_actor uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare a public.profiles; r text; defaults jsonb; override jsonb;
begin
 select * into a from public.profiles where id=p_actor and active is distinct from false;
 if not found then raise exception 'forbidden'; end if;
 r=coalesce(a.role_key,a.role,'agente');
 defaults=jsonb_build_object('viewAgency',r in ('admin','superadmin','diretor','coordenador'),'editAgency',r in ('admin','superadmin','diretor','coordenador'),'approveAgency',r in ('admin','superadmin','diretor','coordenador'),'duplicate',r in ('admin','superadmin','diretor','coordenador','agente','agente_ami'));
 select capabilities into override from public.property_portfolio_permissions where role_key=r;
 return defaults || coalesce(override,'{}') || jsonb_build_object('global',r in ('admin','superadmin'),'ownAMI',coalesce(a.own_ami,false) or r='agente_ami');
end; $$;
create function public.portfolio_allowed(p_actor uuid,p_property uuid,p_kind text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare a public.profiles; p public.properties; owner_agency uuid; own boolean; scope boolean; caps jsonb;
begin
 select * into a from public.profiles where id=p_actor and active is distinct from false; if not found then return false; end if;
 select * into p from public.properties where id=p_property; if not found then return false; end if;
 select agency_id into owner_agency from public.profiles where id=p.agent_id;
 caps=public.portfolio_caps(p_actor); own=p.agent_id=p_actor or p_actor=any(coalesce(p.co_agent_ids,'{}'::uuid[]));
 scope=(caps->>'global')::boolean or (a.agency_id is not null and a.agency_id=owner_agency);
 if p_kind='read' then return own or (scope and (caps->>'viewAgency')::boolean); end if;
 if p_kind='edit' then return own or (scope and (caps->>'viewAgency')::boolean and (caps->>'editAgency')::boolean); end if;
 if p_kind='duplicate' then return (caps->>'duplicate')::boolean and (own or (scope and (caps->>'viewAgency')::boolean and (caps->>'editAgency')::boolean)); end if;
 if p_kind='approve' then return (p.agent_id=p_actor and (caps->>'ownAMI')::boolean) or (scope and (caps->>'viewAgency')::boolean and (caps->>'approveAgency')::boolean); end if;
 return false;
end; $$;
create function public.portfolio_list(p_actor uuid,p_scope text default 'mine') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; caps jsonb;
begin
 caps=public.portfolio_caps(p_actor);
 if p_scope not in ('mine','agency') then raise exception 'invalid_scope'; end if;
 if p_scope='agency' and not (caps->>'viewAgency')::boolean then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(item order by created_at desc,id),'[]'::jsonb) into result from (
  select p.created_at,p.id,jsonb_build_object('id',p.id,'reference',p.reference,'title',p.title,'image',p.cover_url,'municipality',p.municipality,'typology',p.typology,'price',p.price,'area',p.area,'areaUtil',p.area_util,'beds',p.beds,'baths',p.baths,'agentId',p.agent_id,'agentName',a.name,'agencyId',a.agency_id,'agencyName',ag.name,'approval',p.approval,'listingState',p.listing_state,'status',p.status,'state',public.portfolio_state(p.approval::text,p.listing_state,p.off_market,p.status::text),'stateSince',p.portfolio_state_since,'listedAt',p.listed_at,'developmentName',p.development_name,'isDevelopment',p.is_development,'unitLabel',p.unit_label,'documentKinds',p.document_kinds,'documents',coalesce((select jsonb_agg(d->>'kind') from jsonb_array_elements(coalesce(p.documents_meta,'[]'::jsonb)) d where nullif(d->>'url','') is not null),'[]'::jsonb),'sellerType',p.seller_type,'licenseEndorsed',p.license_endorsed,'rejectionReason',p.rejection_reason,'signaturePending',p.is_signature and p.signature_status in ('candidate','pending'),'views',(select count(*) from public.property_engagement e where e.property_id=p.id and e.kind='view'),'contactClicks',(select count(*) from public.property_engagement e where e.property_id=p.id and e.kind='contact'),'leads',(select count(*) from public.leads l where l.property_id=p.id),'priceDrops',coalesce((select jsonb_agg(x) from (select old_price as "from",new_price as "to",created_at as "at" from public.property_price_history h where h.property_id=p.id and new_price<old_price order by created_at desc limit 3) x),'[]'::jsonb),'dropCount',(select count(*) from public.property_price_history h where h.property_id=p.id and new_price<old_price),'canEdit',public.portfolio_allowed(p_actor,p.id,'edit'),'canDuplicate',public.portfolio_allowed(p_actor,p.id,'duplicate'),'canApprove',public.portfolio_allowed(p_actor,p.id,'approve')) as item
  from public.properties p join public.profiles a on a.id=p.agent_id left join public.agencies ag on ag.id=a.agency_id
  where public.portfolio_allowed(p_actor,p.id,'read') and (p_scope='agency' or p.agent_id=p_actor or p_actor=any(coalesce(p.co_agent_ids,'{}'::uuid[])))
 ) q;
 return jsonb_build_object('items',result,'capabilities',caps,'trackingSince',(select tracking_since from public.property_portfolio_meta where id=true));
end; $$;
create function public.portfolio_action(p_actor uuid,p_ids uuid[],p_action text,p_reason text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
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
  if p_action='activate' and (p.approval<>'aprovado' or p.status::text in ('vendido','cpcv')) then raise exception 'approval_required'; end if;
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
create function public.portfolio_duplicate(p_actor uuid,p_source uuid,p_batch uuid,p_units jsonb,p_agent uuid,p_copy_media boolean default true,p_development text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare src public.properties; actor public.profiles; target public.profiles; agency_code int; unit jsonb; template jsonb; nextrow public.properties; n int; seq int; fingerprint text; prior public.property_duplication_batches; result jsonb='[]';
begin
 if jsonb_typeof(p_units)<>'array' or jsonb_array_length(p_units) not between 1 and 100 then raise exception 'invalid_units'; end if;
 select * into src from public.properties where id=p_source for share;
 if not found or not public.portfolio_allowed(p_actor,p_source,'duplicate') then raise exception 'forbidden'; end if;
 select * into actor from public.profiles where id=p_actor; select * into target from public.profiles where id=p_agent and active is distinct from false;
 if target.id is null or (p_agent<>p_actor and (not public.portfolio_allowed(p_actor,p_source,'edit') or (not (public.portfolio_caps(p_actor)->>'global')::boolean and target.agency_id is distinct from actor.agency_id) or (p_source is not null and src.agent_id=p_actor and not (public.portfolio_caps(p_actor)->>'editAgency')::boolean))) then raise exception 'forbidden_target'; end if;
 select code into agency_code from public.agencies where id=target.agency_id;
 if agency_code is null or target.code is null then raise exception 'reference_configuration_missing'; end if;
 fingerprint=md5(jsonb_build_array(p_source,p_agent,p_units,p_copy_media,p_development)::text);
 perform pg_advisory_xact_lock(hashtextextended(p_batch::text,0));
 select * into prior from public.property_duplication_batches where id=p_batch;
 if found then if prior.actor_id<>p_actor or prior.fingerprint<>fingerprint then raise exception 'batch_conflict'; end if; return prior.result; end if;
 select jsonb_object_agg(key,value) into template from jsonb_each(to_jsonb(src)) where key=any(array['title','operation','business_type','type','typology','price','area','area_util','area_dependente','land_area','beds','baths','parish','municipality','district','energy','cover_url','gallery','gallery_meta','video_url','tour_url','short_description','description','seo_description','keywords','construction_year','elevator','accessible','garage','view_type','amenities','neighborhood_notes','latitude','longitude','price_visible','location_privacy','is_development','development_name','development_stage','development_units','development_typologies','development_price_from','development_delivery','development_brochure_url']);
 if not p_copy_media then template=template || jsonb_build_object('cover_url',null,'gallery',null,'gallery_meta',null,'video_url',null,'tour_url',null); end if;
 for unit in select value from jsonb_array_elements(p_units) loop
  if nullif(trim(unit->>'title'),'') is null or length(unit->>'title')>250 or (unit->>'price')::numeric<0 or (unit->>'area')::numeric<0 then raise exception 'invalid_unit_fields'; end if;
  seq=public.next_property_seq(p_agent);
  template=template || jsonb_build_object('id',gen_random_uuid(),'reference','HP'||agency_code||lpad(target.code::text,greatest(3,length(target.code::text)),'0')||'-'||lpad(seq::text,greatest(2,length(seq::text)),'0'),'agent_id',p_agent,'title',unit->>'title','price',(unit->>'price')::numeric,'area',(unit->>'area')::numeric,'area_util',(unit->>'areaUtil')::numeric,'beds',(unit->>'beds')::int,'baths',(unit->>'baths')::int,'typology',unit->>'typology','unit_label',nullif(unit->>'label',''),'approval','rascunho','listing_state','inactivo','status','rascunho','created_at',now(),'listed_at',null,'is_signature',false,'signature_status','candidate','signature_attributes','[]'::jsonb,'signature_visibility','private','signature_price_visible',true,'signature_featured',false,'cmi_exclusive',true,'cmi_renewable',false,'has_placa',false,'has_keys',false,'off_market',false,'interest',0,'duplication_source_id',p_source,'duplication_batch_id',p_batch);
  if nullif(trim(p_development),'') is not null then template=template || jsonb_build_object('is_development',true,'development_name',trim(p_development)); end if;
  select * into nextrow from jsonb_populate_record(null::public.properties,template);
  insert into public.properties select (nextrow).*;
  insert into public.property_audit(property_id,property_ref,actor_id,actor_name,actor_role,action,changes) values(nextrow.id,nextrow.reference,p_actor,actor.name,'helix','duplicou',jsonb_build_array(jsonb_build_object('field','Imóvel modelo','from',src.reference,'to',nextrow.reference)));
  result=result || jsonb_build_array(jsonb_build_object('id',nextrow.id,'reference',nextrow.reference));
 end loop;
 insert into public.property_duplication_batches(id,actor_id,source_id,fingerprint,result) values(p_batch,p_actor,p_source,fingerprint,result);
 return result;
end; $$;
create function public.record_property_engagement(p_property uuid,p_kind text,p_key uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_kind not in ('view','contact') or not exists(select 1 from public.properties where id=p_property and approval='aprovado' and listing_state='activo' and not off_market) then return false; end if;
 insert into public.property_engagement(property_id,kind,dedupe_key) values(p_property,p_kind,p_key) on conflict do nothing;
 return found;
end; $$;
revoke all on function public.portfolio_caps(uuid),public.portfolio_allowed(uuid,uuid,text),public.portfolio_list(uuid,text),public.portfolio_action(uuid,uuid[],text,text),public.portfolio_duplicate(uuid,uuid,uuid,jsonb,uuid,boolean,text),public.record_property_engagement(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.portfolio_caps(uuid),public.portfolio_allowed(uuid,uuid,text),public.portfolio_list(uuid,text),public.portfolio_action(uuid,uuid[],text,text),public.portfolio_duplicate(uuid,uuid,uuid,jsonb,uuid,boolean,text),public.record_property_engagement(uuid,text,uuid) to service_role;
