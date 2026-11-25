-- Individual Facebook Pages. Browser sessions have no direct access to credentials.
create table public.meta_agent_pages (
  page_id text primary key check (page_id ~ '^[0-9]{1,32}$'),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  page_name text not null,
  pipeline text not null check (pipeline in ('compradores', 'proprietarios')),
  sealed_token text,
  setup_id uuid,
  connected_at timestamptz,
  check ((sealed_token is null) = (connected_at is null))
);

alter table public.meta_agent_pages enable row level security;
revoke all on public.meta_agent_pages from public, anon, authenticated;
grant select, insert, update on public.meta_agent_pages to service_role;
create index meta_agent_pages_agent_idx on public.meta_agent_pages(agent_id);

alter table public.leads add column meta_page_id text, add column meta_form_id text;

-- Public lead submissions and the demo generator cannot claim real Meta IDs.
create policy leads_real_meta_ingest_only on public.leads
  as restrictive for insert to anon, authenticated
  with check (meta_page_id is null and meta_form_id is null and
              (external_id is null or external_id !~ '^[0-9]+$'));

-- Apply the same visibility boundary to answers and activity as to the lead.
create policy meta_answers_visible_lead on public.lead_answers
  as restrictive for all to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_answers.lead_id))
  with check (exists (select 1 from public.leads l where l.id = lead_answers.lead_id));

create policy meta_activity_visible_lead on public.lead_activities
  as restrictive for all to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_activities.lead_id))
  with check (exists (select 1 from public.leads l where l.id = lead_activities.lead_id));

-- Keep account scope, deduplication and lead/answers persistence in one transaction.
create function public.ingest_meta_agent_lead(
  p_page_id text, p_agent_id uuid, p_connection_time timestamptz,
  p_external_id text, p_form_id text, p_name text, p_contact text, p_email text,
  p_message text, p_answers jsonb
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  connection public.meta_agent_pages;
  lead_id uuid;
begin
  select m.* into connection
  from public.meta_agent_pages m
  join public.profiles p on p.id = m.agent_id and p.active is distinct from false
  where m.page_id = p_page_id and m.agent_id = p_agent_id
    and m.connected_at = p_connection_time and m.sealed_token is not null
  for share of m, p;
  if not found then return 'connection_changed'; end if;

  insert into public.leads (
    external_id, meta_page_id, meta_form_id, owner_id, assigned_agent_id, commercial_origin_id, pipeline,
    name, contact, email, message, source, qualification, unassigned
  ) values (
    p_external_id, p_page_id, p_form_id, connection.agent_id, connection.agent_id, connection.agent_id,
    connection.pipeline, p_name, p_contact, p_email, p_message, 'facebook', 'novo', false
  )
  on conflict (external_id) where external_id is not null do nothing
  returning id into lead_id;

  if lead_id is null then return 'duplicate'; end if;

  insert into public.lead_answers (lead_id, question_key, value, pii)
  select lead_id, answer.question_key, answer.value, true
  from jsonb_to_recordset(p_answers) as answer(question_key text, value text);

  insert into public.lead_activities (lead_id, type, note)
  values (lead_id, 'created', 'Lead recebida via Facebook Lead Ads.');
  return 'created';
end;
$$;
revoke all on function public.ingest_meta_agent_lead(text, uuid, timestamptz, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_meta_agent_lead(text, uuid, timestamptz, text, text, text, text, text, text, jsonb)
  to service_role;
