-- ============================================================================
-- HousePro — seed de demonstração (agências, consultores, imóveis, negócios,
-- leads, referências, equipas e parcerias). Espelha os dados mock da app.
--
-- Como correr:
--   • `supabase db reset`  → aplica migrações 0001–0008 e corre este seed; ou
--   • `psql "$DATABASE_URL" -f supabase/seed.sql`  (precisa de service role,
--      pois insere em auth.users e ignora RLS).
--
-- Credenciais demo: email <nome>@housepro.pt · password "housepro-demo".
-- Idempotente: usa `on conflict do nothing` / `truncate` das tabelas da app.
-- ============================================================================

begin;

-- Extensão para crypt()/gen_salt() (hash da password).
create extension if not exists pgcrypto;

-- ── auth.users (mínimo necessário) ──────────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
 ('b2222222-2222-4222-8222-222222222201','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ana@housepro.pt',    crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222202','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rui@housepro.pt',    crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222203','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sofia@housepro.pt',  crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222204','00000000-0000-0000-0000-000000000000','authenticated','authenticated','miguel@housepro.pt', crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
 ('b2222222-2222-4222-8222-222222222205','00000000-0000-0000-0000-000000000000','authenticated','authenticated','carla@housepro.pt',  crypt('housepro-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}')
on conflict (id) do nothing;

-- ── auth.identities (OBRIGATÓRIO para login no Supabase/GoTrue atual) ────────
-- Sem uma identidade "email", o login devolve "Invalid login credentials"
-- mesmo com o utilizador e a password corretos.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@housepro.pt'
on conflict do nothing;

-- ── Agências ────────────────────────────────────────────────────────────────
insert into agencies (id, name, slug, region) values
 ('a1111111-1111-4111-8111-111111111101','HousePro Lisboa','lisboa','Lisboa'),
 ('a1111111-1111-4111-8111-111111111102','HousePro Porto','porto','Porto'),
 ('a1111111-1111-4111-8111-111111111103','HousePro Cascais','cascais','Cascais'),
 ('a1111111-1111-4111-8111-111111111104','HousePro Braga','braga','Braga'),
 ('a1111111-1111-4111-8111-111111111105','HousePro Algarve','algarve','Algarve')
on conflict (id) do nothing;

-- ── Perfis (consultores) ────────────────────────────────────────────────────
-- role = enum base (admin|coordenador|agente); role_key = papel preciso.
insert into profiles (id, agency_id, role, role_key, own_ami, name, agency, whatsapp, photo_url, accent) values
 ('b2222222-2222-4222-8222-222222222201','a1111111-1111-4111-8111-111111111101','agente',     'agente',     false,'Ana Marques','HousePro Lisboa','351910000001','/agents/ana.jpg','var(--brand)'),
 ('b2222222-2222-4222-8222-222222222202','a1111111-1111-4111-8111-111111111102','agente',     'agente',     false,'Rui Tavares','HousePro Porto','351910000002','/agents/rui.jpg','var(--gold)'),
 ('b2222222-2222-4222-8222-222222222203','a1111111-1111-4111-8111-111111111103','coordenador','coordenador',false,'Sofia Nunes','HousePro Cascais','351910000003','/agents/sofia.jpg','oklch(0.55 0.09 230)'),
 ('b2222222-2222-4222-8222-222222222204','a1111111-1111-4111-8111-111111111104','agente',     'agente_ami', true, 'Miguel Costa','HousePro Braga','351910000004','/agents/miguel.jpg','oklch(0.62 0.12 40)'),
 ('b2222222-2222-4222-8222-222222222205','a1111111-1111-4111-8111-111111111105','coordenador','diretor',    false,'Carla Sousa','HousePro Algarve','351910000005','/agents/carla.jpg','oklch(0.6 0.11 250)')
on conflict (id) do nothing;

-- ── Imóveis ─────────────────────────────────────────────────────────────────
-- Limpa e reinsere (ordem: dependentes antes).
truncate table properties restart identity cascade;

insert into properties
 (id, reference, title, operation, type, typology, price, area, beds, baths, parish, municipality, energy, status, cover_url, gallery, agent_id, interest, listed_at, sold_at, short_description, description, area_util, area_dependente, land_area, garage, elevator, construction_year, latitude, longitude, commission_type, commission_pct, commission_fixed, commission_justification, commission_approved_by, document_kinds, seller_type, approval, submitted_at, co_agent_ids, commission_split)
values
('c3333333-3333-4333-8333-333333333301', 'HP-1042', 'Apartamento com terraço e vista rio', 'venda', 'Apartamento', 'T3', 685000, 138, 3, 2, 'Alcântara', 'Lisboa', 'A', 'destaque', '/properties/terracotta-dusk.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 84, '2026-07-12', null, null, null, null, null, null, null, null, null, null, null, 'percent', 5, null, null, null, '{cmi,doc_proprietario,caderneta,certidao_predial,cert_energetico,licenca_utilizacao,planta}', 'particular', 'aprovado', null, '{b2222222-2222-4222-8222-222222222202}', '[{"agent_id": "b2222222-2222-4222-8222-222222222201", "pct": 60}, {"agent_id": "b2222222-2222-4222-8222-222222222202", "pct": 40}]'::jsonb),
('c3333333-3333-4333-8333-333333333302', 'HP-1043', 'Moradia contemporânea com jardim e piscina', 'venda', 'Moradia', 'T4', 1250000, 320, 4, 4, 'Birre', 'Cascais', 'A+', 'novo', '/properties/sage-day.svg', '{}', 'b2222222-2222-4222-8222-222222222203', 71, '2026-07-18', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333303', 'HP-1044', 'Apartamento renovado no coração da Baixa', 'venda', 'Apartamento', 'T2', 420000, 92, 2, 1, 'Cedofeita', 'Porto', 'B', 'reduzido', '/properties/dusty-blue.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 90, '2026-07-05', null, null, null, null, null, null, null, null, null, null, null, 'percent', 4, null, null, null, '{caderneta,certidao_predial,cert_energetico,licenca_utilizacao,planta,ficha_tecnica,doc_proprietario}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333304', 'HP-1045', 'Moradia de traça clássica com quintal', 'venda', 'Moradia', 'T3', 560000, 210, 3, 2, 'São Vítor', 'Braga', 'C', 'reservado', '/properties/warm-sand.svg', '{}', 'b2222222-2222-4222-8222-222222222204', 52, '2026-06-20', null, null, null, null, null, null, null, null, null, null, null, 'fixed', null, 12000, null, null, '{caderneta,cert_energetico,planta}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333305', 'HP-1046', 'Penthouse com rooftop privado', 'venda', 'Apartamento', 'T4', 1690000, 245, 4, 3, 'Avenidas Novas', 'Lisboa', 'A', 'destaque', '/properties/twilight.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 80, '2026-07-16', null, null, null, null, null, null, null, null, null, null, null, 'percent', 4.5, null, null, null, '{caderneta,certidao_predial,cert_energetico,licenca_utilizacao}', 'empresa', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333306', 'HP-1047', 'Apartamento para arrendar com varanda', 'arrendamento', 'Apartamento', 'T1', 1350, 64, 1, 1, 'Bonfim', 'Porto', 'B-', 'novo', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 88, '2026-07-19', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333307', 'HP-1048', 'Moradia de luxo com vista mar e piscina', 'venda', 'Moradia', 'T5', 2950000, 540, 5, 5, 'Olhos de Água', 'Albufeira', 'A+', 'oportunidade', '/properties/villa-aerial.jpg', '{/properties/villa-aerial.jpg}', 'b2222222-2222-4222-8222-222222222205', 95, '2026-07-20', null, 'Moradia isolada de arquitetura contemporânea, a poucos minutos da praia de Olhos de Água, com piscina privativa, amplos terraços e vistas desafogadas sobre o mar.', 'Implantada num lote generoso e virada a sul, esta moradia T5 distribui-se por três pisos servidos por elevador. O piso social abre-se para uma sala com pé-direito duplo e envidraçados de correr que ligam ao terraço e à piscina de água salgada. A cozinha, totalmente equipada com eletrodomésticos de gama alta, comunica com uma zona de refeições exterior coberta. Os cinco quartos são todos suites, com roupeiros embutidos e casas de banho revestidas a materiais nobres. Completam o imóvel garagem para três viaturas, painéis solares, domótica e sistema de videovigilância. Uma oportunidade rara na zona premium do Algarve.', 420, 120, 1250, true, true, 2021, 37.0894, -8.1963, 'percent', 5, null, null, null, '{caderneta,certidao_predial,cert_energetico,planta}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-333333333308', 'HP-1049', 'Moradia tradicional portuguesa com piscina', 'venda', 'Moradia', 'T3', 595000, 180, 3, 2, 'São Brás de Alportel', 'Faro', 'C', 'novo', '/properties/casapt-aerial.jpg', '{/properties/casapt-aerial.jpg,/properties/casapt-wc.jpg}', 'b2222222-2222-4222-8222-222222222205', 76, '2026-07-17', null, 'Casa tipicamente algarvia recuperada com bom gosto, com quintal, piscina e a tranquilidade do interior serrano a 20 minutos das praias de Faro.', 'Esta moradia térrea T3 preserva os traços da arquitetura tradicional algarvia — chaminé rendilhada, telha de canudo e platibandas — combinados com uma recuperação recente que trouxe conforto contemporâneo. Dispõe de sala com recuperador de calor, cozinha em plano aberto, três quartos amplos e dois quartos de banho. O logradouro, murado e ajardinado, integra uma piscina e uma zona de churrasco. Com garagem e arrecadação, é a escolha certa para quem procura autenticidade sem abdicar de acessos fáceis.', 150, 30, 640, true, false, 1998, 37.153, -7.888, 'percent', 5, null, null, null, '{caderneta,cert_energetico}', 'particular', 'pendente', '2026-07-22T07:40:00', '{}', null),
('c3333333-3333-4333-8333-333333333309', 'HP-1050', 'Estúdio para investimento no centro histórico', 'venda', 'Apartamento', 'T0', 82000, 38, 0, 1, 'Sé', 'Guarda', 'D', 'oportunidade', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 60, '2026-07-15', null, null, null, null, null, null, null, null, null, null, null, 'fixed', null, 3500, 'Cliente recorrente e angariação estratégica da carteira na Guarda.', 'Carla Sousa (coordenação)', '{caderneta}', 'particular', 'pendente', '2026-07-21T07:40:00', '{}', null),
('c3333333-3333-4333-8333-3333333333a1', 'HP-0990', 'Apartamento renovado junto ao rio', 'venda', 'Apartamento', 'T2', 465000, 98, 2, 2, 'Belém', 'Lisboa', 'B', 'vendido', '/properties/sage-day.svg', '{}', 'b2222222-2222-4222-8222-222222222201', 0, '2026-05-02', '2026-07-10', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-3333333333a2', 'HP-0991', 'Moradia com jardim em zona calma', 'venda', 'Moradia', 'T4', 720000, 260, 4, 3, 'Aldoar', 'Porto', 'A', 'vendido', '/properties/warm-sand.svg', '{}', 'b2222222-2222-4222-8222-222222222202', 0, '2026-04-18', '2026-06-28', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null),
('c3333333-3333-4333-8333-3333333333a3', 'HP-0992', 'T3 com vista serra e garagem', 'venda', 'Apartamento', 'T3', 389000, 120, 3, 2, 'Nogueira', 'Braga', 'B-', 'vendido', '/properties/olive.svg', '{}', 'b2222222-2222-4222-8222-222222222204', 0, '2026-03-30', '2026-06-12', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '{}', 'particular', 'aprovado', null, '{}', null);

-- ── Negócios (deals) ────────────────────────────────────────────────────────
insert into deals (id, property_id, agency_id, buyer_name, seller_name,
                   angariador_id, consultor_comprador_id, coordenador_id,
                   stage, credit_stage, amount) values
 ('d4444444-4444-4444-8444-444444444401','c3333333-3333-4333-8333-333333333303','a1111111-1111-4111-8111-111111111102','João P.','Maria S.',
  'b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222203','cpcv','avaliacao',415000),
 ('d4444444-4444-4444-8444-444444444402','c3333333-3333-4333-8333-333333333307','a1111111-1111-4111-8111-111111111105','Família Oliveira','H. Santos',
  'b2222222-2222-4222-8222-222222222205','b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222205','proposta_aceite','sem_credito',2850000),
 ('d4444444-4444-4444-8444-444444444403','c3333333-3333-4333-8333-333333333305','a1111111-1111-4111-8111-111111111101','L. Ferreira','A. Nunes',
  'b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222203','escritura','escritura_marcada',1650000);

-- ── Leads (incl. lead partilhada por co-angariação) ─────────────────────────
insert into leads (id, property_id, owner_id, co_owner_ids, referrer_id, name,
                   contact, email, intent, message, preferred_at, source, status,
                   read_by, contacted_by, contacted_at, created_at) values
 ('e0000000-0000-4000-8000-0000000000a1','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','{}','b2222222-2222-4222-8222-222222222202','Marta Nogueira',
  '351962223344','marta.n@email.pt','visita','Gostaria de visitar ao fim de semana, se possível de manhã.','2026-07-26T10:30:00','site','novo','{}',null,null,'2026-07-21T18:12:00'),
 ('e0000000-0000-4000-8000-0000000000a2','c3333333-3333-4333-8333-333333333308','b2222222-2222-4222-8222-222222222202','{}',null,'João Pereira',
  '351911556677',null,'mensagem','O valor é negociável? Tenho crédito pré-aprovado.',null,'site','contactado','{}',null,null,'2026-07-20T09:40:00'),
 ('e0000000-0000-4000-8000-0000000000a3','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','{}',null,'Sofia Antunes',
  'sofia.antunes@email.pt','sofia.antunes@email.pt','mensagem','Existe possibilidade de estacionamento adicional?',null,'portal','agendado','{}',null,null,'2026-07-18T15:05:00'),
 -- lead de imóvel co-angariado (Ana dona, Rui co-dono) já contactada pela Ana
 ('e0000000-0000-4000-8000-0000000000a4','c3333333-3333-4333-8333-333333333301','b2222222-2222-4222-8222-222222222201','{b2222222-2222-4222-8222-222222222202}',null,'Tiago Freitas',
  '351963444555',null,'visita','Posso visitar na quinta à tarde?','2026-07-24T16:00:00','site','contactado',
  '{b2222222-2222-4222-8222-222222222201,b2222222-2222-4222-8222-222222222202}','b2222222-2222-4222-8222-222222222201','2026-07-22T10:15:00','2026-07-22T08:00:00');

-- ── Referências ─────────────────────────────────────────────────────────────
insert into referrals (id, type, property_id, from_id, to_id, agency_id,
                       client_name, client_contact, share_pct, proposed_by, note, status) values
 ('e5555555-5555-4555-8555-555555555501','consultor','c3333333-3333-4333-8333-333333333303','b2222222-2222-4222-8222-222222222201','b2222222-2222-4222-8222-222222222202',null,
  'Helena Dias','351962111222',25,'origem','Cliente conheci em Lisboa mas quer comprar no Porto.','pendente'),
 ('e5555555-5555-4555-8555-555555555502','consultor','c3333333-3333-4333-8333-333333333307','b2222222-2222-4222-8222-222222222202','b2222222-2222-4222-8222-222222222205',null,
  'Family Oliveira','351915333444',30,'destino','Investidores, orçamento até 3M no Algarve.','ativa'),
 ('e5555555-5555-4555-8555-555555555503','consultor','c3333333-3333-4333-8333-333333333306','b2222222-2222-4222-8222-222222222204','b2222222-2222-4222-8222-222222222202',null,
  'Pedro Nunes','351919777888',35,'destino','Contraproposta enviada — aguardo o Miguel.','contraproposta'),
 ('e5555555-5555-4555-8555-555555555504','cliente',null,null,null,'a1111111-1111-4111-8111-111111111105',
  'Marta e Rui (amigos)','351968222333',10,'origem','Amigos a comprar casa de férias em Albufeira.','pendente');

-- ── Equipas (com team leader) ───────────────────────────────────────────────
insert into teams (id, name, agency_id, leader_id, status) values
 ('f6666666-6666-4666-8666-666666666601','Equipa Porto Centro','a1111111-1111-4111-8111-111111111102','b2222222-2222-4222-8222-222222222202','aprovada'),
 ('f6666666-6666-4666-8666-666666666602','Equipa Algarve Prime','a1111111-1111-4111-8111-111111111105','b2222222-2222-4222-8222-222222222205','pendente');
insert into team_members (team_id, profile_id) values
 ('f6666666-6666-4666-8666-666666666601','b2222222-2222-4222-8222-222222222202'),
 ('f6666666-6666-4666-8666-666666666602','b2222222-2222-4222-8222-222222222205');

-- ── Parcerias (ambos têm acesso à informação partilhada) ────────────────────
insert into partnerships (id, scope, status) values
 ('f7777777-7777-4777-8777-777777777701','Co-angariação Lisboa ↔ Porto','aprovada'),
 ('f7777777-7777-4777-8777-777777777702','Parceria Braga ↔ Algarve','pendente');
insert into partnership_members (partnership_id, profile_id) values
 ('f7777777-7777-4777-8777-777777777701','b2222222-2222-4222-8222-222222222201'),
 ('f7777777-7777-4777-8777-777777777701','b2222222-2222-4222-8222-222222222202'),
 ('f7777777-7777-4777-8777-777777777702','b2222222-2222-4222-8222-222222222204'),
 ('f7777777-7777-4777-8777-777777777702','b2222222-2222-4222-8222-222222222205');

commit;

-- Fim do seed. 5 agências · 5 consultores · 12 imóveis · 3 negócios · 4 leads
-- · 4 referências · 2 equipas · 2 parcerias.
