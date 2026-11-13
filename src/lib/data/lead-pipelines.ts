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

export const DEFAULT_CUSTOM_STAGES = ["Novo", "Contactado", "Em acompanhamento", "Fechado"];
export const CUSTOM_PIPELINE_KEY = /^custom:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Phone is a separate requirement from having contacted via a web button. */
export function hasPipelinePhone(contact?: string | null): boolean {
  if (!contact || !/^\+?[\d(][\d\s().-]*$/.test(contact.trim())) return false;
  const count = contact.replace(/\D/g, "").length;
  return count >= 7 && count <= 15;
}

export function validPipelineSettings(name: unknown, stages: unknown): stages is string[] {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 60 ||
      !Array.isArray(stages) || stages.length < 2 || stages.length > 12) return false;
  if (!stages.every((s) => typeof s === "string" && s.trim() && s.trim().length <= 40)) return false;
  return new Set(stages.map((s) => s.trim().toLocaleLowerCase("pt-PT"))).size === stages.length;
}
