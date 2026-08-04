-- HousePro — estado de rede do consultor. Quem sai da rede fica inativo (mantém
-- a posição/código no histórico, mas não recebe nem passa override). Depende de
-- 0011 (profiles.sponsor_id).

alter table profiles add column if not exists network_active boolean not null default true;
