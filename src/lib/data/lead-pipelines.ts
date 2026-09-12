/** Pipelines de LEADS (separados do pipeline de Negócios). As leads que entram
 *  são classificadas de forma diferente dos negócios: por origem/intenção
 *  (compradores, proprietários) e movidas pelas suas próprias fases. */
export interface LeadPipeline {
  key: string;
  label: string;
  stages: string[];
}

export const LEAD_PIPELINES: LeadPipeline[] = [
  {
    key: "compradores",
    label: "Compradores",
    stages: ["Novo", "Qualificado", "Visita", "Proposta", "Reserva", "Fechado"],
  },
  {
    key: "proprietarios",
    label: "Proprietários",
    stages: ["Novo", "Contactado", "Reunião", "Angariação", "Publicado"],
  },
];

export const DEFAULT_LEAD_PIPELINE = "compradores";

export function leadPipeline(key?: string): LeadPipeline {
  return LEAD_PIPELINES.find((p) => p.key === key) ?? LEAD_PIPELINES[0];
}
