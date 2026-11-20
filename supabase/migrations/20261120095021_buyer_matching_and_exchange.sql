-- Additive: qualification stays with its contact; the network sees anonymous matching summaries only.
alter table public.contacts add column if not exists buyer_profile jsonb not null default '{}'::jsonb;
alter table public.contacts add constraint contacts_buyer_profile_object check (jsonb_typeof(buyer_profile)='object');
alter table public.properties add column if not exists accepts_exchange boolean not null default false;

create table public.buyer_matches (
 id uuid primary key default gen_random_uuid(),
 contact_id uuid not null references public.contacts(id) on delete cascade,
 property_id uuid not null references public.properties(id) on delete cascade,
 buyer_agent_id uuid not null references public.profiles(id),
 property_agent_id uuid not null references public.profiles(id),
 qualification_ref text not null,
 score integer not null check(score between 0 and 100),
 exact boolean not null,
 summary jsonb not null,
 revision text not null,
 active boolean not null default true,
 updated_at timestamptz not null default now(),
 unique(contact_id,property_id)
);
alter table public.buyer_matches enable row level security;
revoke all on public.buyer_matches from public,anon,authenticated;
grant select on public.buyer_matches to authenticated;
grant all on public.buyer_matches to service_role;
create index buyer_matches_buyer_idx on public.buyer_matches(buyer_agent_id,active);
create index buyer_matches_property_agent_idx on public.buyer_matches(property_agent_id,active);
create index buyer_matches_property_idx on public.buyer_matches(property_id);
-- Narrow definer boolean: it checks the actual matching row, current owners and actor.
-- Required because the property agent cannot read another agency's contact under contact RLS.
create function public.can_read_buyer_match(p_match uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.buyer_matches m
 join public.contacts c on c.id=m.contact_id and c.owner_id=m.buyer_agent_id
 join public.properties p on p.id=m.property_id and p.agent_id=m.property_agent_id
 join public.profiles actor on actor.id=auth.uid() and actor.active
 where m.id=p_match and m.active and auth.uid() in(m.buyer_agent_id,m.property_agent_id)
 and p.approval='aprovado' and p.listing_state='activo' and not p.off_market
 and coalesce(p.status::text,'') not in('vendido','arrendado','cpcv')
 and coalesce(c.buyer_profile->>'active','true')='true');
$$;
revoke all on function public.can_read_buyer_match(uuid) from public,anon;
grant execute on function public.can_read_buyer_match(uuid) to authenticated,service_role;
create policy buyer_matches_participants on public.buyer_matches for select to authenticated using (public.can_read_buyer_match(id));
-- Contact RLS is intentionally NOT broadened to agents from other agencies.
create table helix_private.match_worker (
 id boolean primary key default true check(id),
 secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
 enabled boolean not null default false,
 lock_token uuid, lock_until timestamptz,
 last_run_at timestamptz, last_error text
);
alter table helix_private.match_worker enable row level security;
revoke all on helix_private.match_worker from public,anon,authenticated;
insert into helix_private.match_worker(id) values(true);
create table public.match_email_outbox (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.buyer_matches(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id),
 revision text not null,
 state text not null default 'pending' check(state in ('pending','accepted','failed','cancelled')),
 payload jsonb not null,
 attempts integer not null default 0,
 first_attempt_at timestamptz,
 last_attempt_at timestamptz,
 accepted_at timestamptz,
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 unique(match_id,recipient_id,revision)
);
alter table public.match_email_outbox enable row level security;
revoke all on public.match_email_outbox from public,anon,authenticated;
grant all on public.match_email_outbox to service_role;
create index match_email_pending_idx on public.match_email_outbox(state,created_at);
create index match_email_recipient_idx on public.match_email_outbox(recipient_id);
create function public.match_worker_access(p_token uuid default null, p_release boolean default false, p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r helix_private.match_worker;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'forbidden'; end if;
 if p_token is null then select * into r from helix_private.match_worker where id; return jsonb_build_object('secret',r.secret,'enabled',r.enabled); end if;
 if p_release then
  update helix_private.match_worker set lock_until=null,lock_token=null,last_run_at=now(),last_error=left(p_error,200) where id and lock_token=p_token;
  return jsonb_build_object('released',found);
 end if;
 update helix_private.match_worker set lock_token=p_token,lock_until=now()+interval '3 minutes' where id and (lock_until is null or lock_until<now());
 return jsonb_build_object('claimed',found);
end; $$;
revoke all on function public.match_worker_access(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.match_worker_access(uuid,boolean,text) to service_role;
-- The job is enabled after the matching endpoint has been deployed and verified.
select cron.schedule('housepro-buyer-matches','10 * * * *',$job$
 select net.http_post(url:='https://housepro.pt/api/cron/matches',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000)
 from helix_private.match_worker where id and enabled;
$job$);
