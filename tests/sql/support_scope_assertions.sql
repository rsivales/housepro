-- Run after the migration is authorized and applied. All fixtures roll back.
begin;
do $$
declare a uuid; b uuid; master_id uuid; confidential uuid; normal_ticket uuid;
begin
 select id into a from public.profiles where active and role_key not in('admin','superadmin') limit 1;
 select id into b from public.profiles where active and role_key not in('admin','superadmin') and id<>a limit 1;
 select id into master_id from public.profiles where active and role_key in('admin','superadmin') limit 1;
 if a is null or b is null or master_id is null then raise exception 'Three role fixtures required'; end if;
 confidential:=public.create_support_ticket(a,'conduta','Confidential rollback test','A concrete description used only in a rollback permission test.');
 if not helix_private.ticket_access(confidential,a) then raise exception 'Author cannot read'; end if;
 if not helix_private.ticket_access(confidential,master_id,true) then raise exception 'Brand cannot manage'; end if;
 if helix_private.ticket_access(confidential,b) then raise exception 'Unrelated agent can see confidential ticket'; end if;
 begin perform public.update_support_ticket(b,confidential,1,'Unauthorized response');raise exception 'Unauthorized update accepted';exception when raise_exception then if sqlerrm<>'forbidden' then raise;end if;end;
 perform public.update_support_ticket(master_id,confidential,1,'An initial response.', 'em_analise',true);
 begin perform public.update_support_ticket(a,confidential,1,'A stale response.');raise exception 'Stale version accepted';exception when raise_exception then if sqlerrm<>'stale_revision' then raise;end if;end;
 if (select count(*) from public.support_messages where ticket_id=confidential)<>2 then raise exception 'Audit missing'; end if;
 if has_table_privilege('authenticated','public.support_tickets','insert') then raise exception 'Direct ticket writes exposed';end if;
 if has_function_privilege('anon','public.create_support_ticket(uuid,text,text,text,text,uuid)','execute') then raise exception 'Anonymous RPC exposed';end if;
 if has_table_privilege('authenticated','public.lead_followup_log','insert') then raise exception 'Followup audit writable';end if;
end;$$;
rollback;
