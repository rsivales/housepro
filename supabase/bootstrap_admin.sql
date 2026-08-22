-- HousePro — criar a agência real e tornar o TEU utilizador ADMIN.
--
-- Porquê: publicar um imóvel exige que o teu login tenha um PERFIL com papel
-- e agência. Um utilizador `admin` pode publicar/gerir tudo (a policy de
-- inserção de imóveis permite `auth_role() = 'admin'`).
--
-- ANTES de correr: substitui o email abaixo pelo email com que entras em
-- /entrar (o mesmo que está em Supabase → Authentication → Users).
-- Cola no SQL Editor e corre uma vez. Depois faz logout/login na app.

-- 1) Agência real (dados institucionais HousePro)
insert into agencies (name, slug, region)
values ('HousePro — Tranquil Search Lda', 'housepro', 'Faro')
on conflict (slug) do nothing;

-- 2) O teu perfil de administrador, ligado à agência
insert into profiles (id, agency_id, role, name, agency)
select
  u.id,
  (select id from agencies where slug = 'housepro' limit 1),
  'admin',
  'Administração HousePro',
  'HousePro'
from auth.users u
where u.email = 'SUBSTITUIR_PELO_TEU_EMAIL@exemplo.pt'   -- ← altera isto
on conflict (id) do update
  set role = 'admin',
      agency_id = excluded.agency_id;

-- 3) Confirmação (deve devolver 1 linha com role = admin)
select p.role, p.name, a.name as agencia
from profiles p
left join agencies a on a.id = p.agency_id
join auth.users u on u.id = p.id
where u.email = 'SUBSTITUIR_PELO_TEU_EMAIL@exemplo.pt';   -- ← o mesmo email
