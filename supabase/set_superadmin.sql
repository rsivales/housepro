-- HousePro — tornar o teu utilizador SUPERADMIN (acesso total) e ligá-lo à
-- agência. Resolve também o erro de publicar imóveis. Corre no SQL Editor.
-- (O email já está preenchido; muda se usares outro.)

insert into agencies (name, slug, region)
values ('HousePro — Tranquil Search Lda', 'housepro', 'Faro')
on conflict (slug) do nothing;

-- Se ainda não tiveres perfil, cria-o como superadmin
insert into profiles (id, agency_id, role, role_key, name, agency)
select u.id,
       (select id from agencies where slug = 'housepro' limit 1),
       'admin', 'superadmin',
       coalesce(nullif(split_part(u.email, '@', 1), ''), 'Admin'), 'HousePro'
from auth.users u
where u.email = 'rsilva.housepro@gmail.com'
  and not exists (select 1 from profiles p where p.id = u.id);

-- Se já tiveres perfil, garante superadmin + agência
update profiles p
set role = 'admin',
    role_key = 'superadmin',
    agency_id = coalesce(p.agency_id, (select id from agencies where slug = 'housepro' limit 1))
from auth.users u
where u.id = p.id and u.email = 'rsilva.housepro@gmail.com';

-- Confirmação (deve mostrar role=admin, role_key=superadmin, agency_id preenchido)
select u.email, p.role, p.role_key, p.agency_id
from auth.users u join profiles p on p.id = u.id
where u.email = 'rsilva.housepro@gmail.com';
