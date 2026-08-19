export type LeadSource =
  | "site"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "portal"
  | "consultor";
export type LeadIntent = "mensagem" | "visita" | "custos";
export type LeadStatus = "novo" | "contactado" | "agendado" | "perdido" | "convertido";

/** Estado de qualificação da lead (módulo Meta CRM). */
export type LeadQualification =
  | "novo"
  | "qualificado"
  | "desqualificado"
  | "duplicado";

/** Consentimento/base legal (RGPD) associado à captação da lead. */
export interface LeadConsent {
  /** Base legal (ex.: "consentimento", "interesse legítimo"). */
  base?: string;
  /** Momento em que o consentimento foi dado (ISO). */
  at?: string;
  /** Texto/rótulo do consentimento apresentado ao titular. */
  text?: string;
}

export interface Lead {
  id: string;
  propertyId?: string;
  propertyRef?: string;
  /**
   * ORIGEM/dono comercial da lead (referrer, angariador, ou dono da campanha
   * que a captou). Mantém-se para retrocompatibilidade e histórico.
   */
  ownerId: string;
  /** Co-donos da lead (parceria/co-angariação) — a lead aparece a todos. */
  coOwnerIds?: string[];
  /** Consultor que trouxe o cliente (?ref), quando diferente do angariador. */
  referrerId?: string;
  /** Agentes que já abriram/leram a lead (partilha em tempo real). */
  readBy?: string[];
  /** Agente que já fez o contacto (para o parceiro não repetir). */
  contactedBy?: string;
  contactedAt?: string;
  name: string;
  /** Telefone ou email. */
  contact: string;
  email?: string;
  intent: LeadIntent;
  message?: string;
  /** Data/hora preferida para visita (ISO), quando intent = visita. */
  preferredAt?: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;

  // ── Módulo Meta CRM (todos opcionais — retrocompatível) ────────────────
  /** Campanha Meta que captou a lead. */
  campaignId?: string;
  /** Formulário Meta de origem. */
  formId?: string;
  /**
   * (3) ORIGEM COMERCIAL / dono da lead — quem tem o crédito comercial da lead
   * (normalmente o dono/responsável da campanha). Distinto do responsável atual.
   */
  commercialOriginId?: string;
  /**
   * (4) AGENTE atualmente responsável pela lead (o que a trabalha agora).
   * Pode mudar por reatribuição sem perder a origem comercial.
   */
  assignedAgentId?: string;
  /** Equipa a que a lead foi atribuída (quando aplicável). */
  assignedTeamId?: string;
  /** Pipeline do módulo (compradores | proprietarios | recrutamento). */
  pipeline?: string;
  /** Índice/etapa dentro do pipeline. */
  stage?: number;
  /** Estado de qualificação. */
  qualification?: LeadQualification;
  /** Pontuação de qualificação (0–100). */
  score?: number;
  /** Verdadeiro quando a lead está no inbox "sem responsável". */
  unassigned?: boolean;
  /** Consentimento/base legal (RGPD). */
  consent?: LeadConsent;
  /** Zona/concelho indicado na lead (para atribuição por zona e relatórios). */
  zone?: string;
  /** Orçamento indicado (texto livre do formulário). */
  budget?: string;
  /** Idioma preferido do contacto (para atribuição por idioma). */
  language?: string;
  /** Especialidade pretendida (ex.: luxo, comercial, arrendamento). */
  specialty?: string;
  /**
   * "Primeiro a aceitar": conjunto de consultores a quem a lead foi oferecida.
   * Fica no inbox até um deles aceitar.
   */
  offeredTo?: string[];
  /**
   * Identificador externo do Meta (leadgen_id) — chave de idempotência para
   * evitar criar a mesma lead duas vezes na receção de webhooks.
   */
  externalId?: string;
}

/** Leads de exemplo (modo demo, sem Supabase) — associadas ao consultor Rui. */
export const mockLeads: Lead[] = [
  {
    id: "l1",
    propertyId: "7",
    propertyRef: "HP-1048",
    ownerId: "rui",
    referrerId: "rui",
    name: "Marta Nogueira",
    contact: "351962223344",
    email: "marta.n@email.pt",
    intent: "visita",
    message: "Gostaria de visitar ao fim de semana, se possível de manhã.",
    preferredAt: "2026-07-26T10:30:00",
    source: "site",
    status: "novo",
    createdAt: "2026-07-21T18:12:00",
  },
  {
    id: "l2",
    propertyId: "8",
    propertyRef: "HP-1051",
    ownerId: "rui",
    // Cliente chegou pela página do Rui a ver um imóvel angariado por outro
    referrerId: "rui",
    name: "João Pereira",
    contact: "351911556677",
    intent: "mensagem",
    message: "O valor é negociável? Tenho crédito pré-aprovado.",
    source: "site",
    status: "contactado",
    createdAt: "2026-07-20T09:40:00",
  },
  {
    id: "l3",
    propertyId: "7",
    propertyRef: "HP-1048",
    ownerId: "rui",
    name: "Sofia Antunes",
    contact: "sofia.antunes@email.pt",
    email: "sofia.antunes@email.pt",
    intent: "mensagem",
    message: "Existe possibilidade de estacionamento adicional?",
    source: "portal",
    status: "agendado",
    createdAt: "2026-07-18T15:05:00",
  },
  {
    // Lead de imóvel co-angariado (Rui + Ana). Já foi contactada pela parceira.
    id: "l4",
    propertyId: "1",
    propertyRef: "HP-1042",
    ownerId: "ana",
    coOwnerIds: ["rui"],
    name: "Tiago Freitas",
    contact: "351963444555",
    intent: "visita",
    message: "Posso visitar na quinta à tarde?",
    preferredAt: "2026-07-24T16:00:00",
    source: "site",
    status: "contactado",
    readBy: ["ana", "rui"],
    contactedBy: "ana",
    contactedAt: "2026-07-22T10:15:00",
    createdAt: "2026-07-22T08:00:00",
  },
];

/** Leads do agente: as suas + as de imóveis co-angariados (parceria). */
export const leadsByOwner = (ownerId: string): Lead[] =>
  mockLeads
    .filter((l) => l.ownerId === ownerId || (l.coOwnerIds ?? []).includes(ownerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contactado: "Contactado",
  agendado: "Visita agendada",
  perdido: "Perdido",
  convertido: "Convertido",
};

export const LEAD_QUALIFICATION_LABEL: Record<LeadQualification, string> = {
  novo: "Por qualificar",
  qualificado: "Qualificada",
  desqualificado: "Desqualificada",
  duplicado: "Duplicada",
};

/**
 * Leads captadas via Meta (modo demo) — já normalizadas e atribuídas segundo
 * as regras das campanhas. Mostram o fluxo ponta-a-ponta sem credenciais reais.
 */
export const mockMetaLeads: Lead[] = [
  {
    id: "ml-1",
    ownerId: "carla", // origem comercial (dono/responsável da campanha)
    commercialOriginId: "carla",
    assignedAgentId: "carla",
    campaignId: "cmp-1",
    formId: "form-1",
    pipeline: "compradores",
    stage: 0,
    qualification: "novo",
    score: 60,
    name: "Helena Dias",
    contact: "351962111222",
    email: "helena.dias@email.pt",
    intent: "mensagem",
    message: "Procuro T2/T3 em Albufeira, orçamento 250k–500k.",
    zone: "Albufeira",
    budget: "250k–500k",
    source: "facebook",
    status: "novo",
    consent: { base: "consentimento", at: "2026-08-15T10:00:00" },
    createdAt: "2026-08-15T10:00:00",
  },
  {
    id: "ml-2",
    ownerId: "sofia",
    commercialOriginId: "sofia",
    assignedAgentId: "sofia",
    campaignId: "cmp-2",
    formId: "form-2",
    pipeline: "proprietarios",
    stage: 1,
    qualification: "qualificado",
    score: 80,
    name: "António Reis",
    contact: "351911777333",
    intent: "mensagem",
    message: "Quero vender moradia T4 em Cascais.",
    zone: "Cascais",
    source: "instagram",
    status: "contactado",
    consent: { base: "consentimento", at: "2026-08-14T15:30:00" },
    createdAt: "2026-08-14T15:30:00",
  },
  {
    id: "ml-3",
    // Lead sem responsável (inbox) — campanha de recrutamento não atribui.
    ownerId: "",
    commercialOriginId: "",
    unassigned: true,
    campaignId: "cmp-4",
    formId: "form-3",
    pipeline: "recrutamento",
    stage: 0,
    qualification: "novo",
    name: "Bruno Faria",
    contact: "351915888444",
    email: "bruno.faria@email.pt",
    intent: "mensagem",
    message: "Interessado em ser consultor — 1–3 anos de experiência.",
    source: "facebook",
    status: "novo",
    consent: { base: "consentimento", at: "2026-08-16T09:20:00" },
    createdAt: "2026-08-16T09:20:00",
  },
  {
    id: "ml-4",
    ownerId: "rui",
    commercialOriginId: "rui",
    assignedAgentId: "rui",
    campaignId: "cmp-3",
    formId: "form-1",
    propertyId: "7",
    propertyRef: "HP-1048",
    pipeline: "compradores",
    stage: 2,
    qualification: "qualificado",
    score: 90,
    name: "Family Oliveira",
    contact: "351915333444",
    intent: "visita",
    message: "Investidores, orçamento até 3M, querem visitar a moradia.",
    preferredAt: "2026-08-22T11:00:00",
    zone: "Loulé",
    budget: "+1M",
    source: "facebook",
    status: "agendado",
    consent: { base: "consentimento", at: "2026-08-12T18:00:00" },
    createdAt: "2026-08-12T18:00:00",
  },
];

/** Leads Meta do agente (por responsável atual OU origem comercial). */
export const metaLeadsByAgent = (agentId: string): Lead[] =>
  mockMetaLeads
    .filter((l) => l.assignedAgentId === agentId || l.commercialOriginId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Leads Meta sem responsável (inbox). */
export const unassignedMetaLeads = (): Lead[] =>
  mockMetaLeads
    .filter((l) => l.unassigned || (!l.assignedAgentId && !l.unassigned))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Todas as leads Meta (gestão/relatórios), opcionalmente por pipeline. */
export const allMetaLeads = (pipeline?: string): Lead[] =>
  mockMetaLeads
    .filter((l) => !pipeline || l.pipeline === pipeline)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
