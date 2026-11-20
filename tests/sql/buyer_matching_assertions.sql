begin;
-- Reuse real IDs inside a rolled-back fixture; no emails are queued or sent.
do $$
declare p public.properties; other_agent uuid; fixture_contact uuid; fixture_match uuid;
begin
 select * into p from public.properties where approval='aprovado' and listing_state='activo' and not off_market and coalesce(status::text,'') not in('vendido','arrendado','cpcv') and agent_id is not null limit 1;
 if p.id is null then raise exception 'No eligible property for permission fixture'; end if;
 select id into other_agent from public.profiles where active and id<>p.agent_id limit 1;
 if other_agent is null then raise exception 'Two agents required'; end if;
 insert into public.contacts(name,type,owner_id,buyer_profile) values('MATCH TEST ROLLBACK','comprador',other_agent,'{"budgetMax":300000,"zones":["Faro"],"typologies":["T2"],"urgency":"alta"}') returning id into fixture_contact;
 insert into public.buyer_matches(contact_id,property_id,buyer_agent_id,property_agent_id,qualification_ref,score,exact,summary,revision) values(fixture_contact,p.id,other_agent,p.agent_id,'CQ-TEST',100,true,'{"buyerEligible":true,"propertyEligible":true}','test') returning id into fixture_match;
 perform set_config('test.match_id',fixture_match::text,true);
 perform set_config('test.contact_id',fixture_contact::text,true);
 perform set_config('test.property_id',p.id::text,true);
 perform set_config('test.buyer_id',other_agent::text,true);
 perform set_config('test.seller_id',p.agent_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_agent,'role','authenticated')::text,true);
 if not public.can_read_buyer_match(fixture_match) then raise exception 'Buyer agent blocked'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p.agent_id,'role','authenticated')::text,true);
 if not public.can_read_buyer_match(fixture_match) then raise exception 'Property agent blocked'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 if public.can_read_buyer_match(fixture_match) then raise exception 'Unrelated agent can read match'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if not (public.match_worker_access(gen_random_uuid())->>'claimed')::boolean then raise exception 'Worker lock unavailable'; end if;
 if (public.match_worker_access(gen_random_uuid())->>'claimed')::boolean then raise exception 'Worker double claim'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.seller_id'),'role','authenticated')::text,true);
do $$begin
 if not exists(select 1 from public.buyer_matches where id=current_setting('test.match_id')::uuid) then raise exception 'Seller RLS read failed'; end if;
 if has_table_privilege('authenticated','public.match_email_outbox','select') then raise exception 'Email outbox exposed'; end if;
 if has_function_privilege('anon','public.match_worker_access(uuid,boolean,text)','execute') then raise exception 'Worker exposed'; end if;
end $$;
reset role;
update public.contacts set buyer_profile='{"active":false}' where id=current_setting('test.contact_id')::uuid;
do $$begin
 if public.can_read_buyer_match(current_setting('test.match_id')::uuid) then raise exception 'Paused buyer still readable'; end if;
end $$;
update public.contacts set buyer_profile='{}',owner_id=current_setting('test.seller_id')::uuid where id=current_setting('test.contact_id')::uuid;
do $$begin
 if public.can_read_buyer_match(current_setting('test.match_id')::uuid) then raise exception 'Reassigned contact still readable'; end if;
end $$;
rollback;
