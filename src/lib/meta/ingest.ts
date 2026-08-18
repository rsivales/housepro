import type { Lead } from "@/lib/data/leads";
import type {
  Campaign,
  LeadForm,
  FieldMapping,
  LeadAnswer,
  LeadField,
} from "@/lib/data/meta";
import { pipelineForCampaignType } from "@/lib/data/meta";

/** Par bruto (chave da pergunta → valor) tal como chega do Meta. */
export interface RawAnswer {
  key: string;
  value: string;
}

/** Campos de PII (marcados nas respostas para mascarar em logs). */
const PII_FIELDS: LeadField[] = ["name", "email", "contact"];

/** Resultado da normalização: campos da lead + respostas completas. */
export interface NormalizedLead {
  fields: Partial<Lead>;
  answers: Omit<LeadAnswer, "leadId">[];
}

/**
 * Normaliza as respostas de um formulário Meta em campos de lead, aplicando o
 * mapeamento pergunta→campo. As perguntas sem mapeamento (ou mapeadas a
 * "custom") ficam guardadas como resposta livre (LeadAnswer), sem se perderem.
 */
export function normalizeAnswers(
  raw: RawAnswer[],
  form: LeadForm | undefined,
  mapping: FieldMapping | undefined
): NormalizedLead {
  const fields: Partial<Lead> = {};
  const answers: Omit<LeadAnswer, "leadId">[] = [];

  const mapFor = (key: string): LeadField => {
    const m = mapping?.map.find((x) => x.questionKey === key);
    return m?.leadField ?? "custom";
  };
  const labelFor = (key: string): string | undefined =>
    form?.questions.find((q) => q.key === key)?.label;

  for (const a of raw) {
    const field = mapFor(a.key);
    answers.push({
      questionKey: a.key,
      label: labelFor(a.key),
      value: a.value,
      pii: PII_FIELDS.includes(field),
    });

    switch (field) {
      case "name":
        fields.name = a.value;
        break;
      case "email":
        fields.email = a.value;
        break;
      case "contact":
        fields.contact = a.value;
        break;
      case "message":
        fields.message = a.value;
        break;
      case "zone":
        fields.zone = a.value;
        break;
      case "budget":
        fields.budget = a.value;
        break;
      case "propertyRef":
        fields.propertyRef = a.value;
        break;
      case "preferredAt":
        fields.preferredAt = a.value;
        break;
      case "intent":
        if (["mensagem", "visita", "custos"].includes(a.value)) {
          fields.intent = a.value as Lead["intent"];
        }
        break;
      default:
        break; // custom → fica só na resposta livre
    }
  }

  return { fields, answers };
}

/**
 * Constrói o esqueleto de uma lead Meta a partir da campanha, formulário e
 * respostas normalizadas — SEM decidir o responsável (isso é o motor de
 * atribuição da Fase E). Nasce no inbox "sem responsável".
 */
export function buildMetaLead(
  campaign: Campaign,
  form: LeadForm | undefined,
  normalized: NormalizedLead
): Partial<Lead> {
  const now = new Date().toISOString();
  return {
    name: normalized.fields.name ?? "Sem nome",
    contact: normalized.fields.contact ?? "",
    email: normalized.fields.email,
    message: normalized.fields.message,
    zone: normalized.fields.zone,
    budget: normalized.fields.budget,
    propertyRef: normalized.fields.propertyRef,
    preferredAt: normalized.fields.preferredAt,
    intent: normalized.fields.intent ?? "mensagem",
    source: "facebook",
    status: "novo",
    campaignId: campaign.id,
    formId: form?.id,
    // (3) ORIGEM COMERCIAL — dono/responsável da campanha detém o crédito.
    commercialOriginId: campaign.responsibleId ?? campaign.ownerId,
    ownerId: campaign.responsibleId ?? campaign.ownerId ?? "",
    // (4) responsável atual — indefinido até a atribuição (Fase E).
    assignedAgentId: undefined,
    unassigned: true,
    pipeline: pipelineForCampaignType(campaign.type),
    stage: 0,
    qualification: "novo",
    consent: { base: "consentimento", at: now, text: "Formulário Meta Lead Ads" },
    createdAt: now,
  };
}

// ── Gerador de leads de teste (modo demo / desenvolvimento) ────────────────

const SAMPLE_NAMES = [
  "Ana Ferreira",
  "Bruno Martins",
  "Catarina Lopes",
  "Diogo Sousa",
  "Eva Ribeiro",
  "Fábio Gomes",
];
const SAMPLE_ZONES = ["Albufeira", "Cascais", "Loulé", "Faro", "Lisboa", "Porto"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Gera respostas plausíveis para cada pergunta do formulário (teste). */
export function sampleAnswersForForm(form: LeadForm): RawAnswer[] {
  const name = pick(SAMPLE_NAMES);
  return form.questions.map((q) => {
    let value = "";
    if (q.options && q.options.length) value = pick(q.options);
    else if (q.type === "email")
      value = name.toLowerCase().replace(/\s+/g, ".") + "@email.pt";
    else if (q.type === "phone") value = "3519" + Math.floor(10000000 + Math.random() * 89999999);
    else if (q.key.toLowerCase().includes("name") || q.key.toLowerCase().includes("nome"))
      value = name;
    else if (q.key.toLowerCase().includes("zone") || q.key.toLowerCase().includes("local"))
      value = pick(SAMPLE_ZONES);
    else value = "Interessado — lead de teste.";
    return { key: q.key, value };
  });
}

/** Converte respostas normalizadas em linhas LeadAnswer (para a persistência). */
export function toLeadAnswers(
  leadId: string,
  answers: Omit<LeadAnswer, "leadId">[]
): LeadAnswer[] {
  return answers.map((a) => ({ ...a, leadId }));
}
