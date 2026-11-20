begin;
do $$
declare actor uuid; leadid uuid; result jsonb; contactid uuid; repeated jsonb; snapshot jsonb; other_actor uuid;
begin
 if public.contact_phone_key('912 345 678')<>public.contact_phone_key('+351912345678') or public.contact_phone_key('00351912345678')<>public.contact_phone_key('912345678') then raise exception 'phone_normalization'; end if;
 if public.lead_is_identified('(contacto via Chamada)',null) then raise exception 'anonymous_identified'; end if;
 if not public.lead_is_identified('912345678',null) then raise exception 'phone_rejected'; end if;
 select id into actor from public.profiles where active=true order by id limit 1;
 select id into other_actor from public.profiles where active=true and id<>actor order by id limit 1;
 insert into public.leads(owner_id,assigned_agent_id,name,contact,email,source,intent,message,sub_source,zone)
 values(actor,actor,'Identity integration test','+351999001122','identity-test-20261120@example.invalid','site','mensagem','Pedido integral de avaliação','Avaliação de imóvel','Zona de teste') returning id into leadid;
 insert into public.lead_answers(lead_id,question_key,label,value) values(leadid,'condition','Estado','Bom estado');
 result:=public.save_contact_identity(actor,'{}',leadid);
 contactid:=(result#>>'{contact,id}')::uuid;
 if contactid is null or (select contact_id from public.leads where id=leadid)<>contactid then raise exception 'link_failed'; end if;
 if not exists(select 1 from public.contact_activities where lead_id=leadid and contact_id=contactid and body like '%Estado: Bom estado%') then raise exception 'answers_lost'; end if;
 repeated:=public.save_contact_identity(actor,'{}',leadid);
 if repeated#>>'{contact,id}'<>contactid::text or (select count(*) from public.contact_activities where lead_id=leadid and type='lead_import')<>1 then raise exception 'not_idempotent'; end if;
 repeated:=public.save_contact_identity(actor,'{"name":"Repeated","phone":"999001122","email":"IDENTITY-TEST-20261120@example.invalid"}',null);
 if not (repeated->>'exists')::boolean then raise exception 'duplicate_not_detected'; end if;
 repeated:=public.save_contact_identity(other_actor,'{"name":"Repeated","phone":"999001122"}',null);
 if not (repeated->>'conflict')::boolean or repeated ? 'contact' then raise exception 'other_owner_information_exposed'; end if;
 begin
  perform public.save_contact_identity(other_actor,'{}',leadid);
  raise exception 'unauthorized_link_allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.contacts(name,phone,type) values('Duplicate','999001122','outro');
  raise exception 'unique_phone_missing';
 exception when unique_violation then null; end;
 select to_jsonb(c) into snapshot from public.contacts c where id=contactid;
 begin
  perform public.save_contact_identity(actor,'{"name":"Invalid","email":"invalid"}',leadid);
  raise exception 'invalid_email_allowed';
 exception when raise_exception then
  if sqlerrm <> 'invalid_email' then raise; end if;
 end;
 if snapshot is distinct from (select to_jsonb(c) from public.contacts c where id=contactid) then raise exception 'partial_write'; end if;
 insert into public.leads(owner_id,name,contact,source,intent) values(actor,'Cliente do site','(contacto via WhatsApp)','site','mensagem') returning id into leadid;
 if not (select interaction_only from public.leads where id=leadid) then raise exception 'anonymous_not_classified'; end if;
end $$;
rollback;
