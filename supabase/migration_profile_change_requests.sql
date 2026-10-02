-- #NN — Pedidos de alteração de perfil (nome, foto, WhatsApp)
-- O próprio consultor propõe alterações ao seu perfil (nome, foto, WhatsApp);
-- ficam pendentes até a coordenação/administração aprovar. Ao aprovar, os
-- campos são aplicados a profiles pela rota de servidor (service_role).
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

create table if not exists profile_change_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  name        text,
  photo_url   text,
  whatsapp    text,
  status      text not null default 'pendente',   -- pendente | aprovado | recusado | cancelado
  note        text,
  decided_by  uuid references profiles(id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table profile_change_requests enable row level security;

-- O próprio consultor vê, cria e edita/cancela os SEUS pedidos enquanto
-- estiverem pendentes. As decisões (aprovar/recusar) são feitas por rotas de
-- servidor com service_role (que ignora o RLS), depois de validar o papel.
drop policy if exists "profile_req_select_own" on profile_change_requests;
create policy "profile_req_select_own" on profile_change_requests
  for select using (profile_id = auth.uid());

drop policy if exists "profile_req_insert_own" on profile_change_requests;
create policy "profile_req_insert_own" on profile_change_requests
  for insert with check (profile_id = auth.uid());

drop policy if exists "profile_req_update_own_pending" on profile_change_requests;
create policy "profile_req_update_own_pending" on profile_change_requests
  for update
  using (profile_id = auth.uid() and status = 'pendente')
  with check (profile_id = auth.uid() and status in ('pendente', 'cancelado'));
