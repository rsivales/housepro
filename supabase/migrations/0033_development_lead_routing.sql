-- Transactional routing for public development lead magnets.
create or replace function public.capture_development_lead(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := payload->>'kind';
  v_email text := lower(trim(coalesce(payload->>'email', '')));
  v_name text := trim(coalesce(payload->>'name', ''));
  v_phone text := trim(coalesce(payload->>'phone', ''));
  v_project uuid;
  v_sub_source text;
  v_agency uuid;
  v_agent uuid;
  v_broker uuid;
  v_last uuid;
  v_lead uuid;
  v_updated boolean := false;
begin
  if v_kind not in ('information','brochure','guide','alert')
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce((payload->>'operationalConsent')::boolean, false) is not true
     or (v_kind in ('information','brochure','guide') and v_name = '') then
    raise exception 'invalid_fields' using errcode = '22023';
  end if;

  if coalesce(payload->>'projectId','') ~* '^[0-9a-f-]{36}$' then
    v_project := (payload->>'projectId')::uuid;
  end if;

  v_sub_source := case v_kind
    when 'information' then 'Empreendimentos — Pedido de informação'
    when 'brochure' then 'Empreendimentos — Brochura'
    when 'guide' then 'Empreendimentos — Guia comprador em planta'
    else 'Empreendimentos — Alerta'
  end;

  -- A project request belongs to its real responsible consultant.
  if v_project is not null then
    select p.agent_id, pr.agency_id into v_agent, v_agency
    from properties p left join profiles pr on pr.id=p.agent_id
    where p.id=v_project and p.status='publicado';
  end if;

  -- Generic magnets enter the active agency pool and atomic round-robin.
  if v_agent is null then
    select a.id into v_agency from agencies a
    where exists (select 1 from profiles p where p.agency_id=a.id and p.active=true and p.role_key in ('agente','agente_ami'))
    order by a.created_at,a.id limit 1;
    if v_agency is not null then
      insert into lead_routing_state(agency_id) values(v_agency) on conflict do nothing;
      select last_agent_id into v_last from lead_routing_state where agency_id=v_agency for update;
      select p.id into v_agent from profiles p
      where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami')
        and (v_last is null or (p.created_at,p.id) > (select q.created_at,q.id from profiles q where q.id=v_last))
      order by p.created_at,p.id limit 1;
      if v_agent is null then
        select p.id into v_agent from profiles p where p.agency_id=v_agency and p.active=true and p.role_key in ('agente','agente_ami') order by p.created_at,p.id limit 1;
      end if;
      update lead_routing_state set last_agent_id=v_agent,updated_at=now() where agency_id=v_agency;
    end if;
  end if;

  if v_agency is null and v_agent is not null then
    select agency_id into v_agency from profiles where id=v_agent;
  end if;
  select id into v_broker from profiles where agency_id=v_agency and active=true and role_key in ('diretor','admin') order by created_at,id limit 1;

  select id into v_lead from leads
  where lower(email)=v_email and sub_source=v_sub_source and status <> 'perdido'
    and (v_project is null or property_id=v_project)
  order by created_at desc limit 1;

  if v_lead is null then
    insert into leads(owner_id,assigned_agent_id,agency_id,property_id,name,contact,email,message,source,status,intent,sub_source,page_url,marketing_consent,consent,unassigned)
    values(v_agent,v_agent,v_agency,v_project,coalesce(nullif(v_name,''),'Subscritor de alerta'),coalesce(nullif(v_phone,''),v_email),v_email,left(coalesce(payload->>'message',''),2000),'site','novo','mensagem',v_sub_source,left(coalesce(payload->>'pageUrl',''),500),coalesce((payload->>'marketingConsent')::boolean,false),jsonb_build_object('operational',true,'at',now()),v_agent is null)
    returning id into v_lead;
  else
    update leads set owner_id=v_agent,assigned_agent_id=v_agent,agency_id=v_agency,contact=coalesce(nullif(v_phone,''),v_email),message=left(coalesce(payload->>'message',''),2000),page_url=left(coalesce(payload->>'pageUrl',''),500),marketing_consent=coalesce((payload->>'marketingConsent')::boolean,false),updated_at=now(),unassigned=v_agent is null where id=v_lead;
    v_updated := true;
  end if;

  insert into lead_routing_events(lead_id,agency_id,agent_id,broker_id,reason)
  values(v_lead,v_agency,v_agent,v_broker,case when v_project is not null and v_agent is not null then 'Consultor responsável pelo empreendimento' when v_agent is not null then 'Round-robin de consultores ativos' else 'Sem consultor elegível; aguarda broker' end);
  insert into lead_activities(lead_id,type,note,to_val) values(v_lead,'assigned','Distribuição automática · Empreendimentos',v_agent::text);

  return jsonb_build_object('ok',true,'id',v_lead,'updated',v_updated,'assigned',v_agent is not null,'assignedAgentId',v_agent,'brokerId',v_broker);
end $$;

revoke all on function public.capture_development_lead(jsonb) from public, anon, authenticated;
grant execute on function public.capture_development_lead(jsonb) to service_role;
