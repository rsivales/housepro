-- HousePro — códigos numéricos legíveis para agências e agentes, base das
-- referências de imóveis (<país><agência><agente>-<seq>) e dos códigos de
-- padrinhado (<prefixo>A<geração>G<posição>). Depende de 0001.

alter table agencies add column if not exists code smallint;   -- 2 dígitos
alter table profiles add column if not exists code integer;    -- 4 dígitos

-- Atribui códigos sequenciais aos que ainda não têm (ordem de criação).
update agencies a set code = sub.rn
  from (select id, row_number() over (order by created_at) as rn from agencies) sub
  where a.id = sub.id and a.code is null;

update profiles p set code = sub.rn
  from (select id, row_number() over (partition by agency_id order by created_at) as rn from profiles) sub
  where p.id = sub.id and p.code is null;
