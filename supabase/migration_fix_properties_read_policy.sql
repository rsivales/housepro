-- CRÍTICO — corrige a leitura pública de `properties`, que tinha DUAS
-- políticas de SELECT em simultâneo com nomes diferentes ("published
-- properties read" e "properties public read"), criadas em alturas
-- diferentes do histórico deste projeto. A segunda foi pensada para
-- substituir a primeira ("Substitui a política de leitura pública para
-- respeitar a aprovação" — ver reset_and_setup.sql), mas o DROP só apanhava
-- o nome da segunda; a primeira, mais permissiva, nunca foi removida. Como
-- políticas de SELECT em RLS são combinadas com OR, a mais permissiva das
-- duas manda — o que pode ter causado exatamente o oposto do que se queria
-- (imóveis não aprovados a aparecerem, ou o inverso, consoante qual delas
-- ficou ativa de facto no ambiente real).
--
-- Corrige na fonte: apaga as duas pelo nome (idempotente) e cria UMA única
-- política, clara e intencional — corresponde ao que a app agora espera
-- (src/app/imovel/[id]/page.tsx): "fora de mercado" é o único que bloqueia
-- mesmo a partilha por link direto; pendente de aprovação/documentos
-- continua acessível a quem tem o link (partilha privada com cliente/
-- proprietário), só não entra em pesquisas/portais (isso é filtrado à parte,
-- na aplicação, por listProperties()).
--
-- Corre no Supabase (SQL Editor). Seguro para correr mais do que uma vez.

drop policy if exists "published properties read" on properties;
drop policy if exists "properties public read" on properties;

create policy "properties public read" on properties for select
  using (
    off_market = false
    or agent_id = auth.uid()
    or agency_id_of(agent_id) = auth_agency()
  );
