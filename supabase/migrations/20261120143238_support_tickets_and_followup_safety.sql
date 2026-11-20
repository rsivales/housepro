-- Structured tickets, immutable conversation and role/agency boundaries.
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), ticket_no bigint generated always as identity unique,
 opened_by uuid not null references public.profiles(id), agency_id uuid references public.agencies(id),
 topic text not null check(topic in('tecnico_acesso','tecnico_crm','tecnico_imoveis','tecnico_integracoes','leads_sla','atribuicao','comissoes','fees','conduta','apoio','sugestao')),
 scope text not null check(scope in('agencia','marca','tecnico','confidencial')),
 subject text not null check(length(subject) between 8 and 160),
 description text not null check(length(description) between 15 and 10000),
 priority text not null default 'normal' check(priority in('normal','alta','urgente')),
 status text not null default 'aberto' check(status in('aberto','em_analise','aguarda_requerente','resolvido','fechado')),
 assigned_to uuid references public.profiles(id), related_lead_id uuid references public.leads(id) on delete set null,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),resolved_at timestamptz
);
create table public.support_messages (
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid not null references public.profiles(id),body text not null check(length(body) between 2 and 10000),
 kind text not null default 'resposta' check(kind in('resposta','estado')),created_at timestamptz not null default now()
);
create index support_tickets_author_idx on public.support_tickets(opened_by,created_at desc);
create index support_tickets_agency_idx on public.support_tickets(agency_id,scope,status);
create index support_tickets_assignee_idx on public.support_tickets(assigned_to);
create index support_tickets_lead_idx on public.support_tickets(related_lead_id);
create index support_messages_ticket_idx on public.support_messages(ticket_id,created_at);
create index support_messages_author_idx on public.support_messages(author_id);
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_tickets,public.support_messages from public,anon,authenticated;
grant select on public.support_tickets,public.support_messages to authenticated;
grant all on public.support_tickets,public.support_messages to service_role;
grant usage on sequence public.support_tickets_ticket_no_seq to service_role;
create function helix_private.ticket_access(p_ticket uuid,p_actor uuid,p_manage boolean default false) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.support_tickets t join public.profiles a on a.id=p_actor and a.active
 where t.id=p_ticket and (
 (not p_manage and t.opened_by=a.id)
 or a.role_key in('admin','superadmin')
 or (t.scope='tecnico' and a.role_key='apoio')
 or (t.scope='agencia' and a.role_key in('diretor','coordenador') and t.agency_id=a.agency_id)
 or (t.scope='agencia' and exists(select 1 from public.agency_finance_settings ag where ag.agency_id=t.agency_id and ag.broker_id=a.id))));
$$;
revoke all on function helix_private.ticket_access(uuid,uuid,boolean) from public,anon,authenticated;
create function public.can_read_support_ticket(p_ticket uuid) returns boolean language sql stable security definer set search_path='' as $$
 select helix_private.ticket_access(p_ticket,auth.uid());
$$;
revoke all on function public.can_read_support_ticket(uuid) from public,anon;
grant execute on function public.can_read_support_ticket(uuid) to authenticated,service_role;
create policy support_ticket_read on public.support_tickets for select to authenticated using(public.can_read_support_ticket(id));
create policy support_message_read on public.support_messages for select to authenticated using(public.can_read_support_ticket(ticket_id));

create function public.create_support_ticket(p_actor uuid,p_topic text,p_subject text,p_description text,p_priority text default 'normal',p_lead uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.profiles; dest text; tid uuid; target uuid;
begin
 select * into a from public.profiles where id=p_actor and active;
 if a.id is null then raise exception 'forbidden'; end if;
 if p_topic not in('tecnico_acesso','tecnico_crm','tecnico_imoveis','tecnico_integracoes','leads_sla','atribuicao','comissoes','fees','conduta','apoio','sugestao') then raise exception 'invalid_topic'; end if;
 dest:=case when p_topic like 'tecnico_%' then 'tecnico' when p_topic='conduta' then 'confidencial' when p_topic in('comissoes','fees','sugestao') then 'marca' else 'agencia' end;
 if dest='agencia' and a.agency_id is null then dest:='marca'; end if;
 if p_lead is not null and not exists(select 1 from public.leads l where l.id=p_lead and (a.id in(l.owner_id,l.assigned_agent_id) or a.id=any(l.co_owner_ids) or (a.role_key in('diretor','coordenador','admin','superadmin') and a.agency_id= l.agency_id))) then raise exception 'forbidden_lead'; end if;
 insert into public.support_tickets(opened_by,agency_id,topic,scope,subject,description,priority,related_lead_id)
 values(a.id,a.agency_id,p_topic,dest,trim(p_subject),trim(p_description),p_priority,p_lead) returning id into tid;
 -- Notify handlers only; confidential content is never copied into general notifications.
 for target in select distinct p.id from public.profiles p where p.active and p.id<>a.id and (
 p.role_key in('admin','superadmin') or (dest='tecnico' and p.role_key='apoio') or (dest='agencia' and p.agency_id=a.agency_id and p.role_key in('diretor','coordenador')) or (dest='agencia' and exists(select 1 from public.agency_finance_settings ag where ag.agency_id=a.agency_id and ag.broker_id=p.id))) loop
 insert into public.notifications(user_id,type,title,body,href) values(target,'info','Novo ticket de apoio','Existe um pedido para analisar na sua área de responsabilidade.','/app/apoio?ticket='||tid);
 end loop;
 return tid;
end;$$;
create function public.update_support_ticket(p_actor uuid,p_ticket uuid,p_revision integer,p_body text default null,p_status text default null,p_claim boolean default false,p_escalate boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare t public.support_tickets; manager boolean; next_status text; target uuid;
begin
 select * into t from public.support_tickets where id=p_ticket for update;
 if t.id is null or not helix_private.ticket_access(t.id,p_actor) then raise exception 'forbidden'; end if;
 if p_revision is null or t.revision<>p_revision then raise exception 'stale_revision'; end if;
 manager:=helix_private.ticket_access(t.id,p_actor,true);
 if p_status is not null and p_status not in('aberto','em_analise','aguarda_requerente','resolvido','fechado') then raise exception 'invalid_status'; end if;
 if not manager and ((p_status is not null and p_status not in('aberto','fechado')) or p_claim or p_escalate) then raise exception 'forbidden'; end if;
 if p_claim and t.assigned_to is not null and t.assigned_to<>p_actor then raise exception 'already_assigned'; end if;
 if p_body is not null and length(trim(p_body)) not between 2 and 10000 then raise exception 'invalid_message'; end if;
 if p_status='resolvido' and (p_body is null or length(trim(p_body))<5) then raise exception 'resolution_note_required'; end if;
 if p_body is null and p_status is null and not p_claim and not p_escalate then raise exception 'empty_update'; end if;
 if p_body is not null then insert into public.support_messages(ticket_id,author_id,body) values(t.id,p_actor,trim(p_body)); end if;
 next_status:=coalesce(p_status,case when t.status='aguarda_requerente' and t.opened_by=p_actor and p_body is not null then 'aberto' else t.status end);
 if next_status<>t.status or p_claim or p_escalate then
 insert into public.support_messages(ticket_id,author_id,body,kind) values(t.id,p_actor,concat('Estado: ',next_status,case when p_claim then ' · Responsável: próprio' else '' end,case when p_escalate then ' · Encaminhado para a Marca' else '' end),'estado'); end if;
 update public.support_tickets set status=next_status,assigned_to=case when p_escalate then null when p_claim then p_actor else assigned_to end,scope=case when p_escalate and scope='agencia' then 'marca' else scope end,
 revision=revision+1,updated_at=now(),resolved_at=case when next_status in('resolvido','fechado') then coalesce(resolved_at,now()) else null end where id=t.id;
 -- Only the author and current handler receive a content-free notification.
 for target in select distinct x from (select unnest(array[t.opened_by,t.assigned_to]) x union select id from public.profiles where p_escalate and active and role_key in('admin','superadmin')) recipients where x is not null and x<>p_actor loop
 if helix_private.ticket_access(t.id,target) then insert into public.notifications(user_id,type,title,body,href) values(target,'info','Ticket atualizado','Consulte a resposta ou alteração de estado.','/app/apoio?ticket='||t.id); end if; end loop;
end;$$;
create function public.support_dashboard(p_actor uuid,p_status text default null,p_topic text default null,p_page integer default 0,p_ticket uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and active) then raise exception 'forbidden'; end if;
 with visible as (select t.*,a.name as author_name,h.name as handler_name,helix_private.ticket_access(t.id,p_actor,true) as can_manage from public.support_tickets t join public.profiles a on a.id=t.opened_by left join public.profiles h on h.id=t.assigned_to where helix_private.ticket_access(t.id,p_actor)),
 filtered as(select * from visible where (p_status is null or status=p_status) and (p_topic is null or topic=p_topic)),
 page as(select * from filtered order by updated_at desc,id limit 30 offset greatest(0,least(p_page,10000))*30)
 select jsonb_build_object('tickets',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),
 'metrics',jsonb_build_object('open',(select count(*) from visible where status in('aberto','em_analise','aguarda_requerente')),'resolved',(select count(*) from visible where status in('resolvido','fechado')),'unassigned',(select count(*) from visible where status not in('resolvido','fechado') and assigned_to is null),'averageResolutionHours',(select round(avg(extract(epoch from (resolved_at-created_at))/3600)::numeric,1) from visible where resolved_at is not null),'byTopic',(select coalesce(jsonb_object_agg(topic,n),'{}') from (select topic,count(*) n from visible group by topic) s)),
 'selected',(select to_jsonb(v) from visible v where v.id=p_ticket),'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from (select msg.*,a.name as author_name from public.support_messages msg join public.profiles a on a.id=msg.author_id where msg.ticket_id=p_ticket and helix_private.ticket_access(p_ticket,p_actor) order by msg.created_at desc,msg.id desc limit 200) m),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.create_support_ticket(uuid,text,text,text,text,uuid),public.update_support_ticket(uuid,uuid,integer,text,text,boolean,boolean),public.support_dashboard(uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.create_support_ticket(uuid,text,text,text,text,uuid),public.update_support_ticket(uuid,uuid,integer,text,text,boolean,boolean),public.support_dashboard(uuid,text,text,integer,uuid) to service_role;

-- Read receipts belong to each participant and to the current matching revision.
create table public.buyer_match_receipts(match_id uuid not null references public.buyer_matches(id) on delete cascade,user_id uuid not null references public.profiles(id),revision text not null,read_at timestamptz,primary key(match_id,user_id));
create index buyer_match_receipts_user_idx on public.buyer_match_receipts(user_id);
alter table public.buyer_match_receipts enable row level security;
revoke all on public.buyer_match_receipts from public,anon,authenticated;
grant select,insert,update on public.buyer_match_receipts to authenticated;
grant all on public.buyer_match_receipts to service_role;
create policy match_receipt_own on public.buyer_match_receipts for all to authenticated using(user_id=(select auth.uid()) and public.can_read_buyer_match(match_id)) with check(user_id=(select auth.uid()) and public.can_read_buyer_match(match_id));
create function public.list_buyer_matches(p_filter text default 'all',p_contact uuid default null,p_property uuid default null,p_page integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with q as(select m.*,r.read_at as seen_at,(r.read_at is not null and r.revision=m.revision) as seen from public.buyer_matches m left join public.buyer_match_receipts r on r.match_id=m.id and r.user_id=auth.uid() where m.active and auth.uid() in(m.buyer_agent_id,m.property_agent_id) and (p_contact is null or m.contact_id=p_contact) and (p_property is null or m.property_id=p_property)),
 filtered as(select * from q where p_filter='all' or (p_filter='unread' and not seen) or(p_filter='read' and seen)),
 page as(select * from filtered order by score desc,id limit 30 offset greatest(0,least(p_page,10000))*30)
 select jsonb_build_object('matches',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'unread',(select count(*) from q where not seen));
$$;
revoke all on function public.list_buyer_matches(text,uuid,uuid,integer) from public,anon;
grant execute on function public.list_buyer_matches(text,uuid,uuid,integer) to authenticated,service_role;

-- Persist first action and follow-up deadlines independently of read receipts.
alter table public.leads add column followup_state text not null default 'por_contactar' check(followup_state in('por_contactar','contactado','tentativa','aguarda_cliente','acompanhamento','encerrado'));
alter table public.leads add column last_followup_at timestamptz;
alter table public.leads add column next_followup_at timestamptz;
alter table public.leads add column sla_started_at timestamptz not null default now();
update public.leads set followup_state='contactado',last_followup_at=coalesce(contacted_at,updated_at,created_at) where contacted_at is not null or status in('contactado','agendado');
create function helix_private.reset_assigned_lead_deadline() returns trigger language plpgsql set search_path='' as $$ begin
 if coalesce(new.assigned_agent_id,new.owner_id) is distinct from coalesce(old.assigned_agent_id,old.owner_id) then new.sla_started_at:=now();new.followup_state:='por_contactar';new.last_followup_at:=null;new.next_followup_at:=null;end if;return new;end;$$;
revoke all on function helix_private.reset_assigned_lead_deadline() from public,anon,authenticated;
create trigger lead_assignment_deadline before update of owner_id,assigned_agent_id on public.leads for each row execute function helix_private.reset_assigned_lead_deadline();
create table public.lead_followup_log(id uuid primary key,lead_id uuid not null references public.leads(id) on delete cascade,actor_id uuid not null references public.profiles(id),action text not null,note text not null,next_at timestamptz,created_at timestamptz not null default now());
create index lead_followup_log_lead_idx on public.lead_followup_log(lead_id,created_at desc);
create index lead_followup_log_actor_idx on public.lead_followup_log(actor_id);
alter table public.lead_followup_log enable row level security;
revoke all on public.lead_followup_log from public,anon,authenticated;
grant all on public.lead_followup_log to service_role;
create table helix_private.lead_sla_state(lead_id uuid primary key references public.leads(id) on delete cascade,owner_id uuid references public.profiles(id),due_at timestamptz not null,warned_at timestamptz,review_ticket uuid references public.support_tickets(id));
alter table helix_private.lead_sla_state enable row level security;
revoke all on helix_private.lead_sla_state from public,anon,authenticated;
create function public.record_lead_followup(p_actor uuid,p_lead uuid,p_action text,p_note text,p_next timestamptz,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.profiles;l public.leads;
begin
 select * into a from public.profiles where id=p_actor and active;
 select * into l from public.leads where id=p_lead for update;
 if a.id is null or l.id is null or not coalesce((a.id in(l.owner_id,l.assigned_agent_id) or coalesce(a.id=any(l.co_owner_ids),false) or (a.role_key in('coordenador','diretor','admin','superadmin') and a.agency_id=l.agency_id)),false) then raise exception 'forbidden'; end if;
 if exists(select 1 from public.lead_followup_log where id=p_request and actor_id=p_actor and lead_id=p_lead) then return; end if;
 if p_action not in('contactado','tentativa','aguarda_cliente','acompanhamento','encerrado') or length(trim(p_note)) not between 5 and 3000 then raise exception 'invalid_followup'; end if;
 if p_action<>'encerrado' and (p_next is null or p_next<=now() or p_next>now()+interval '90 days') then raise exception 'invalid_deadline'; end if;
 insert into public.lead_followup_log(id,lead_id,actor_id,action,note,next_at) values(p_request,p_lead,p_actor,p_action,trim(p_note),case when p_action='encerrado' then null else p_next end);
 update public.leads set followup_state=p_action,last_followup_at=now(),next_followup_at=case when p_action='encerrado' then null else p_next end,
 contacted_at=case when p_action='contactado' then coalesce(contacted_at,now()) else contacted_at end,
 contacted_by=case when p_action='contactado' then coalesce(contacted_by,p_actor) else contacted_by end,
 status=case when p_action='contactado' then 'contactado' else status end,updated_at=now() where id=p_lead;
 update public.notifications set read=true,dismissed_at=now() where href='/app/leads/'||p_lead and type='qualidade' and user_id in(l.owner_id,l.assigned_agent_id) and (title like 'Contacto por atender%' or title like 'Acompanhamento em atraso%');
 if l.contact_id is not null then insert into public.contact_activities(contact_id,type,title,body,actor_id,actor_name,lead_id) values(l.contact_id,'note','Acompanhamento: '||p_action,p_note,p_actor,a.name,p_lead); end if;
end;$$;
create function public.lead_followup_history(p_actor uuid,p_lead uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select f.*,p.name as actor_name from public.lead_followup_log f join public.profiles p on p.id=f.actor_id where f.lead_id=p_lead and exists(select 1 from public.leads l join public.profiles a on a.id=p_actor and a.active where l.id=p_lead and (a.id in(l.owner_id,l.assigned_agent_id) or coalesce(a.id=any(l.co_owner_ids),false) or(a.role_key in('coordenador','diretor','admin','superadmin') and a.agency_id=l.agency_id))) order by f.created_at desc limit 100) x;
$$;
create function helix_private.check_lead_followups(p_owner uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.leads;s helix_private.lead_sla_state;owner uuid;deadline timestamptz;outcomes jsonb:='[]';tid uuid;
begin
 for l in select * from public.leads where (p_owner is null or coalesce(assigned_agent_id,owner_id)=p_owner)
 and followup_state<>'encerrado' and status not in('perdido','convertido','arquivado','cancelado')
 and (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or contact ~ '^[+0-9 ().-]{7,}$' or contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 and (next_followup_at is not null or (followup_state='por_contactar' and last_followup_at is null)) for update skip locked loop
 owner:=coalesce(l.assigned_agent_id,l.owner_id);
 if not exists(select 1 from public.profiles where id=owner and active) then continue; end if;
 deadline:=coalesce(l.next_followup_at,l.sla_started_at+interval '48 hours');
 if deadline>now() then continue; end if;
 insert into helix_private.lead_sla_state(lead_id,owner_id,due_at) values(l.id,owner,deadline) on conflict(lead_id) do update set owner_id=excluded.owner_id,due_at=excluded.due_at,warned_at=null,review_ticket=null where lead_sla_state.owner_id is distinct from excluded.owner_id or lead_sla_state.due_at<>excluded.due_at;
 select * into s from helix_private.lead_sla_state where lead_id=l.id for update;
 if s.warned_at is null then
 update helix_private.lead_sla_state set warned_at=now() where lead_id=l.id;
 insert into public.notifications(user_id,type,title,body,href) values(owner,'qualidade','Acompanhamento em atraso','Registe o resultado da ação e agende o próximo contacto. Não há transferência automática nem penalização.','/app/leads/'||l.id);
 elsif s.review_ticket is null and s.warned_at<=now()-interval '24 hours' then
 tid:=public.create_support_ticket(owner,'leads_sla','Rever acompanhamento da lead', 'Prazo de acompanhamento ultrapassado. A gestão deve verificar o histórico com o consultor antes de qualquer alteração de responsável. Este ticket não comprova abandono nem aplica penalizações. Lead: '||l.id,'alta',l.id);
 update helix_private.lead_sla_state set review_ticket=tid where lead_id=l.id;
 end if;
 outcomes:=outcomes||jsonb_build_array(jsonb_build_object('leadId',l.id,'name',l.name,'outcome',case when s.review_ticket is not null then 'review' when s.warned_at is not null and s.warned_at<=now()-interval '24 hours' then 'review' else 'warned' end));
 end loop;
 return outcomes;
end;$$;
revoke all on function helix_private.check_lead_followups(uuid) from public,anon,authenticated;
create function public.check_my_lead_followups(p_actor uuid) returns jsonb language sql security definer set search_path='' as $$ select helix_private.check_lead_followups(p_actor); $$;
revoke all on function public.record_lead_followup(uuid,uuid,text,text,timestamptz,uuid),public.lead_followup_history(uuid,uuid),public.check_my_lead_followups(uuid) from public,anon,authenticated;
grant execute on function public.record_lead_followup(uuid,uuid,text,text,timestamptz,uuid),public.lead_followup_history(uuid,uuid),public.check_my_lead_followups(uuid) to service_role;
select cron.schedule('housepro-safe-lead-followups','20 * * * *',$job$select helix_private.check_lead_followups();$job$);
