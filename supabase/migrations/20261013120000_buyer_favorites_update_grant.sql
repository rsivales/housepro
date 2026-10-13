-- Corrige o upsert de favoritos (route /api/cliente/favoritos): o Supabase
-- client faz sempre "INSERT ... ON CONFLICT (user_id, property_id) DO UPDATE",
-- e isso exige privilégio de UPDATE mesmo quando não há conflito real — sem
-- ele, o Postgres recusa o upsert e o pedido falha silenciosamente (o erro é
-- engolido no cliente, que já tinha otimisticamente marcado o coração). Sem
-- este grant/policy, os favoritos nunca chegam a ficar guardados na conta.

grant update on buyer_favorites to authenticated;

drop policy if exists "buyer favorites update own" on buyer_favorites;
create policy "buyer favorites update own" on buyer_favorites
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
