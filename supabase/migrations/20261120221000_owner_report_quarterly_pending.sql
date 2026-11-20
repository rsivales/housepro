create or replace function public.save_owner_report_settings(
 p_property uuid,p_agent uuid,p_expected uuid,p_settings jsonb,p_from timestamptz,p_next timestamptz
) returns boolean language plpgsql set search_path='' as $$
declare r public.owner_report_settings; start_at timestamptz; quarterly_start timestamptz; pending_quarterly timestamptz;
begin
 perform 1 from public.properties where id=p_property and agent_id=p_agent for update;
 if not found then return false; end if;
 select * into r from public.owner_report_settings where property_id=p_property for update;
 if r.revision is distinct from p_expected then return false; end if;
 start_at=coalesce(r.period_from,p_from);
 select least(start_at,min(period_start)) into start_at from public.owner_report_outbox
 where property_id=p_property and state='pending' and kind='owner';
 quarterly_start=coalesce(r.quarterly_period_from,greatest((select created_at from public.properties where id=p_property),now()-interval '3 months'));
 select min(period_start) into pending_quarterly from public.owner_report_outbox
 where property_id=p_property and state='pending' and kind='owner_quarterly';
 quarterly_start=least(quarterly_start,pending_quarterly);
 update public.owner_report_outbox set state='cancelled' where property_id=p_property and state='pending';
 insert into public.owner_report_settings(property_id,agent_id,settings,period_from,next_at,quarterly_next_at,quarterly_period_from)
 values(p_property,p_agent,p_settings,start_at,p_next,
  case when coalesce((p_settings->>'quarterly')::boolean,false) then case when pending_quarterly is not null then now()+interval '10 minutes' else coalesce(r.quarterly_next_at,now()+interval '3 months') end end,
  case when coalesce((p_settings->>'quarterly')::boolean,false) then quarterly_start end)
 on conflict(property_id) do update set
 agent_id=excluded.agent_id,settings=excluded.settings,revision=gen_random_uuid(),
 period_from=excluded.period_from,next_at=excluded.next_at,
 quarterly_next_at=excluded.quarterly_next_at,quarterly_period_from=excluded.quarterly_period_from,updated_at=now();
 return true;
end;
$$;
