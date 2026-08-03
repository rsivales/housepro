-- HousePro — multimédia rica do imóvel + categoria de empreendimentos (obra nova).
-- Depende de 0001, 0004 e 0005.
--
-- Reúne num único ficheiro as colunas que faltavam para:
--   • visualizador único de media  (vídeo, tour 360º, antes/depois)
--   • distrito                     (indexação em portais / organização por zona)
--   • empreendimentos novos        (categoria própria + flag de obra nova)

alter table properties
  -- Multimédia (o visualizador do detalhe consome estes campos).
  add column if not exists video_url        text,
  add column if not exists tour_url         text,
  -- Pares antes/depois (virtual staging / obras): [{before, after, label}].
  add column if not exists before_after     jsonb,
  -- Distrito (Faro, Lisboa, Porto…).
  add column if not exists district         text,
  -- Empreendimento novo (obra nova).
  add column if not exists is_development    boolean default false,
  add column if not exists development_name  text,
  add column if not exists development_stage text,     -- planta | construcao | pronto
  add column if not exists development_units integer;

-- Consultas rápidas à categoria de empreendimentos.
create index if not exists properties_development_idx
  on properties (is_development)
  where is_development = true;
