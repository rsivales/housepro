-- Atribui código sequencial (4 dígitos, por agência) a qualquer consultor
-- que ainda não tenha (perfis criados depois do arranque inicial nunca
-- receberam código — a rota de criação não o atribuía, já corrigido no
-- código). Continua a partir do maior código já usado em cada agência, para
-- nunca colidir com códigos existentes. Corre no Supabase (SQL Editor).
-- Seguro para correr mais do que uma vez (só atribui a quem tem `code is
-- null` e tem agência).

with maxcode as (
  select agency_id, coalesce(max(code), 0) as base
  from profiles
  where agency_id is not null
  group by agency_id
),
ranked as (
  select p.id, p.agency_id,
         row_number() over (partition by p.agency_id order by p.created_at) as rn
  from profiles p
  where p.code is null and p.agency_id is not null
)
update profiles p
set code = maxcode.base + ranked.rn
from ranked
join maxcode on maxcode.agency_id = ranked.agency_id
where p.id = ranked.id;
