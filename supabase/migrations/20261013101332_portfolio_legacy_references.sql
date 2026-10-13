-- Preserve the existing reference convention for legacy agencies without a code.
create or replace function public.portfolio_duplicate(p_actor uuid,p_source uuid,p_batch uuid,p_units jsonb,p_agent uuid,p_copy_media boolean default true,p_development text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare src public.properties; actor public.profiles; target public.profiles; agency_code int; unit jsonb; template jsonb; nextrow public.properties; n int; seq int; fingerprint text; prior public.property_duplication_batches; result jsonb='[]';
begin
 if jsonb_typeof(p_units)<>'array' or jsonb_array_length(p_units) not between 1 and 100 then raise exception 'invalid_units'; end if;
 select * into src from public.properties where id=p_source for share;
 if not found or not public.portfolio_allowed(p_actor,p_source,'duplicate') then raise exception 'forbidden'; end if;
 select * into actor from public.profiles where id=p_actor; select * into target from public.profiles where id=p_agent and active is distinct from false;
 if target.id is null or (p_agent<>p_actor and (not public.portfolio_allowed(p_actor,p_source,'edit') or (not (public.portfolio_caps(p_actor)->>'global')::boolean and target.agency_id is distinct from actor.agency_id) or (p_source is not null and src.agent_id=p_actor and not (public.portfolio_caps(p_actor)->>'editAgency')::boolean))) then raise exception 'forbidden_target'; end if;
 select coalesce(code,0) into agency_code from public.agencies where id=target.agency_id;
 if agency_code is null or target.code is null then raise exception 'reference_configuration_missing'; end if;
 fingerprint=md5(jsonb_build_array(p_source,p_agent,p_units,p_copy_media,p_development)::text);
 perform pg_advisory_xact_lock(hashtextextended(p_batch::text,0));
 select * into prior from public.property_duplication_batches where id=p_batch;
 if found then if prior.actor_id<>p_actor or prior.fingerprint<>fingerprint then raise exception 'batch_conflict'; end if; return prior.result; end if;
 select jsonb_object_agg(key,value) into template from jsonb_each(to_jsonb(src)) where key=any(array['title','operation','business_type','type','typology','price','area','area_util','area_dependente','land_area','beds','baths','parish','municipality','district','energy','cover_url','gallery','gallery_meta','video_url','tour_url','short_description','description','seo_description','keywords','construction_year','elevator','accessible','garage','view_type','amenities','neighborhood_notes','latitude','longitude','price_visible','location_privacy','is_development','development_name','development_stage','development_units','development_typologies','development_price_from','development_delivery','development_brochure_url']);
 if not p_copy_media then template=template || jsonb_build_object('cover_url',null,'gallery',null,'gallery_meta',null,'video_url',null,'tour_url',null); end if;
 for unit in select value from jsonb_array_elements(p_units) loop
  if nullif(trim(unit->>'title'),'') is null or length(unit->>'title')>250 or (unit->>'price')::numeric<0 or (unit->>'area')::numeric<0 then raise exception 'invalid_unit_fields'; end if;
  perform pg_advisory_xact_lock(hashtextextended('property-ref:'||agency_code::text||':'||target.code::text,0));
  loop
   seq=public.next_property_seq(p_agent);
   exit when not exists(select 1 from public.properties where reference='HP'||agency_code||lpad(target.code::text,greatest(3,length(target.code::text)),'0')||'-'||lpad(seq::text,greatest(2,length(seq::text)),'0'));
  end loop;
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
