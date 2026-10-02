-- ─────────────────────────────────────────────────────────────────────────
-- Referência de imóvel gerada automaticamente, nunca à mão e nunca
-- duplicada: HP<agência><agente 3 díg.>-<sequência 2 díg.> — ex.: "HP1001-01"
-- é o 1.º imóvel do agente nº 1 da agência nº 1.
--
-- Até aqui a referência era um campo de texto livre no formulário — o
-- consultor escrevia-a à mão (sujeito a erro/duplicação) e o servidor só a
-- gerava como reserva se o campo viesse vazio, contando linhas existentes
-- (o que reatribui o mesmo número se um imóvel for apagado). Passa a ser
-- SEMPRE gerada no servidor, com um contador monótono (nunca reutilizado,
-- mesmo que um imóvel seja apagado) e atómico (sem condição de corrida entre
-- duas angariações em simultâneo).
-- ─────────────────────────────────────────────────────────────────────────

-- Próximo número de agente (3 dígitos) a atribuir dentro de cada agência.
alter table agencies add column if not exists next_agent_code int not null default 1;
-- Arranca a seguir ao maior código de agente já atribuído nessa agência.
update agencies a set next_agent_code = coalesce((select max(p.code) from profiles p where p.agency_id = a.id), 0) + 1;

-- Próximo número de imóvel (2 dígitos) a atribuir a cada agente.
alter table profiles add column if not exists next_property_seq int not null default 1;
-- Arranca a seguir à contagem de imóveis já angariados por esse agente.
update profiles p set next_property_seq = coalesce((select count(*) from properties pr where pr.agent_id = p.id), 0) + 1;

-- Referência antiga, de outra agência/plataforma, para imóveis migrados —
-- mantém o rasto à origem do processo sem quebrar a coerência da nova
-- numeração (nunca aparece ao público).
alter table properties add column if not exists legacy_reference text;

-- Atribui e incrementa atomicamente — chamado uma vez por criação de
-- consultor/imóvel; nunca reutiliza um número, mesmo sob concorrência.
create or replace function next_agent_code(p_agency uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update agencies set next_agent_code = next_agent_code + 1
    where id = p_agency
    returning next_agent_code - 1 into v;
  return v;
end;
$$;

create or replace function next_property_seq(p_agent uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update profiles set next_property_seq = next_property_seq + 1
    where id = p_agent
    returning next_property_seq - 1 into v;
  return v;
end;
$$;
