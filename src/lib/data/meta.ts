/**
 * Módulo CRM de Leads Meta (Facebook/Instagram) — modelo de dados.
 *
 * Este ficheiro define os tipos e os DADOS DE EXEMPLO (modo demo) do módulo.
 * Tal como o resto da app, funciona sem Supabase nem credenciais Meta: a camada
 * `src/lib/db/repo.ts` cai nestes mocks quando `isSupabaseConfigured()` é falso,
 * para o fluxo ser demonstrável ponta-a-ponta com fixtures.
 *
 * PRINCÍPIOS (ver auditoria):
 *  - Segredos/tokens Meta NUNCA vivem aqui nem no frontend: uma ligação guarda
 *    apenas `tokenRef` (referência a um segredo server-side), nunca o token.
 *  - Distinguem-se 4 papéis: (1) DONO da campanha, (2) RESPONSÁVEL da campanha,
 *    (3) ORIGEM COMERCIAL / dono da lead, (4) AGENTE atualmente responsável.
 *  - Recrutamento é um tipo de campanha à parte — separável dos relatórios
 *    comerciais.
 *  - Tokens de design: sem cores hardcoded; os estados usam classes utilitárias
 *    sobre os tokens do tema para a futura reformulação (Fase G) ser trivial.
 */

// ─────────────────────────────────────────────────────────────
// Ligação Meta (página/conta) — SEM tokens em claro
// ─────────────────────────────────────────────────────────────

export type MetaConnectionStatus = "demo" | "ligada" | "desligada" | "erro";

export interface MetaConnection {
  id: string;
  /** ID da Página do Facebook. */
  pageId: string;
  pageName: string;
  /** Conta de Instagram associada (opcional). */
  igId?: string;
  igName?: string;
  /**
   * REFERÊNCIA ao segredo guardado server-side (env/vault) — nunca o token.
   * Ex.: "meta:page:1234" resolve para uma variável de ambiente no servidor.
   */
  tokenRef?: string;
  /** Permissões concedidas (leads_retrieval, pages_show_list, …). */
  scopes: string[];
  status: MetaConnectionStatus;
  connectedAt?: string;
}

export const META_CONNECTION_STATUS: Record<
  MetaConnectionStatus,
  { label: string; badge: string; dot: string }
> = {
  demo: {
    label: "Demonstração",
    badge: "bg-secondary text-muted-foreground",
    dot: "bg-slate-400",
  },
  ligada: {
    label: "Ligada",
    badge: "bg-primary/15 text-primary",
    dot: "bg-primary",
  },
  desligada: {
    label: "Desligada",
    badge: "bg-secondary text-muted-foreground",
    dot: "bg-slate-400",
  },
  erro: {
    label: "Erro",
    badge: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
};

// ─────────────────────────────────────────────────────────────
// Campanhas
// ─────────────────────────────────────────────────────────────

/** Tipo/objetivo comercial da campanha. */
export type CampaignType =
  | "BUYER" // procura de compradores
  | "SELLER" // angariação (proprietários que querem vender)
  | "PROPERTY" // um imóvel específico
  | "PROPERTY_SET" // conjunto de imóveis / empreendimento
  | "RECRUITMENT" // recrutamento de consultores (separado do comercial)
  | "INSTITUTIONAL" // marca / notoriedade
  | "OTHER";

/** Quem é o DONO da campanha: a agência (marca) ou um consultor. */
export type CampaignOwnerType = "AGENCY" | "AGENT";

export type CampaignStatus = "rascunho" | "ativa" | "pausada" | "terminada";

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  /** (1) DONO — agência ou consultor. */
  ownerType: CampaignOwnerType;
  /** ID do dono (agencyId quando AGENCY, agentId quando AGENT). */
  ownerId: string;
  ownerName?: string;
  /** (2) RESPONSÁVEL pela gestão da campanha (pode diferir do dono). */
  responsibleId?: string;
  responsibleName?: string;
  objective?: string;
  /** Referência à campanha de anúncios no Meta (externa) — informativa. */
  metaCampaignId?: string;
  status: CampaignStatus;
  createdAt: string;
}

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  BUYER: "Compradores",
  SELLER: "Angariação",
  PROPERTY: "Imóvel específico",
  PROPERTY_SET: "Conjunto / empreendimento",
  RECRUITMENT: "Recrutamento",
  INSTITUTIONAL: "Institucional",
  OTHER: "Outro",
};

/** Campanhas comerciais (excluem recrutamento e institucional). */
export const COMMERCIAL_CAMPAIGN_TYPES: CampaignType[] = [
  "BUYER",
  "SELLER",
  "PROPERTY",
  "PROPERTY_SET",
];

export const isCommercialCampaign = (t: CampaignType): boolean =>
  COMMERCIAL_CAMPAIGN_TYPES.includes(t);

export const CAMPAIGN_STATUS: Record<
  CampaignStatus,
  { label: string; badge: string; dot: string }
> = {
  rascunho: {
    label: "Rascunho",
    badge: "bg-secondary text-muted-foreground",
    dot: "bg-slate-400",
  },
  ativa: { label: "Ativa", badge: "bg-primary/15 text-primary", dot: "bg-primary" },
  pausada: {
    label: "Pausada",
    badge: "bg-gold/15 text-gold-foreground",
    dot: "bg-amber-500",
  },
  terminada: {
    label: "Terminada",
    badge: "bg-secondary text-muted-foreground",
    dot: "bg-slate-500",
  },
};

/** Associação N:N campanha ↔ imóvel (para PROPERTY / PROPERTY_SET). */
export interface CampaignProperty {
  campaignId: string;
  propertyId: string;
  propertyRef?: string;
}

// ─────────────────────────────────────────────────────────────
// Formulários Meta e perguntas
// ─────────────────────────────────────────────────────────────

export type QuestionType =
  | "text"
  | "email"
  | "phone"
  | "select"
  | "multiselect"
  | "number"
  | "date"
  | "boolean"
  | "other";

export interface LeadFormQuestion {
  /** Chave da pergunta no Meta (field key). */
  key: string;
  /** Rótulo mostrado ao utilizador no formulário. */
  label: string;
  type: QuestionType;
  /** Opções (select/multiselect). */
  options?: string[];
}

export interface LeadForm {
  id: string;
  /** ID do formulário no Meta (Lead Ad form). */
  metaFormId: string;
  name: string;
  campaignId?: string;
  questions: LeadFormQuestion[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Mapeamento pergunta → campo da lead
// ─────────────────────────────────────────────────────────────

/** Campos normalizados de uma lead para onde uma pergunta pode ser mapeada. */
export type LeadField =
  | "name"
  | "email"
  | "contact"
  | "message"
  | "intent"
  | "preferredAt"
  | "propertyRef"
  | "budget"
  | "zone"
  | "custom"; // mantém-se como resposta livre (LeadAnswer), sem normalizar

export const LEAD_FIELD_LABEL: Record<LeadField, string> = {
  name: "Nome",
  email: "Email",
  contact: "Telefone / contacto",
  message: "Mensagem",
  intent: "Intenção",
  preferredAt: "Data preferida",
  propertyRef: "Referência do imóvel",
  budget: "Orçamento",
  zone: "Zona / concelho",
  custom: "Resposta livre (sem normalizar)",
};

export interface FieldMappingEntry {
  questionKey: string;
  leadField: LeadField;
  note?: string;
}

export interface FieldMapping {
  formId: string;
  map: FieldMappingEntry[];
}

// ─────────────────────────────────────────────────────────────
// Regras de atribuição
// ─────────────────────────────────────────────────────────────

export type AssignStrategy =
  | "specific" // consultor específico (obrigatório indicar agentId)
  | "team" // uma equipa
  | "round_robin" // rotação por um conjunto de consultores
  | "round_robin_weighted" // rotação ponderada (pesos por consultor)
  | "zone" // por zona/concelho → agência ou consultor
  | "property" // pelo angariador do imóvel associado
  | "budget" // por escalão de orçamento → destino
  | "language" // por idioma → destino
  | "specialty" // por especialidade → destino
  | "first_accept" // oferecida a um conjunto; o 1.º a aceitar fica com ela
  | "manual" // distribuição manual (fica no inbox à espera do gestor)
  | "unassigned"; // fica no inbox "Leads sem responsável"

export const ASSIGN_STRATEGY_LABEL: Record<AssignStrategy, string> = {
  specific: "Consultor específico",
  team: "Equipa",
  round_robin: "Rotação (round-robin)",
  round_robin_weighted: "Rotação ponderada",
  zone: "Por zona / concelho",
  property: "Angariador do imóvel",
  budget: "Por orçamento",
  language: "Por idioma",
  specialty: "Por especialidade",
  first_accept: "Primeiro a aceitar",
  manual: "Manual (inbox)",
  unassigned: "Sem responsável (inbox)",
};

export interface AssignmentRule {
  id: string;
  campaignId: string;
  strategy: AssignStrategy;
  /** specific → consultor de destino. */
  agentId?: string;
  agentName?: string;
  /** team → equipa de destino. */
  teamId?: string;
  /** round_robin / round_robin_weighted / first_accept → conjunto de consultores. */
  pool?: string[];
  /** round_robin → índice do próximo a receber (estado). */
  rrIndex?: number;
  /** round_robin_weighted → peso por consultor (agentId → peso ≥ 1). */
  weights?: Record<string, number>;
  /** zone → mapa concelho→destino (agencyId ou agentId). */
  zoneMap?: Record<string, string>;
  /** budget → mapa escalão→destino (ex.: "250k–500k" → agentId). */
  budgetMap?: Record<string, string>;
  /** language → mapa idioma→destino (ex.: "en" → agentId). */
  languageMap?: Record<string, string>;
  /** specialty → mapa especialidade→destino. */
  specialtyMap?: Record<string, string>;
  /** Substituto quando o destino está indisponível (horário/férias). */
  substituteId?: string;
  /** Último recurso antes do inbox, se ninguém elegível. */
  fallbackId?: string;
  /** Limite diário de leads por consultor (0/ausente = sem limite). */
  dailyLimit?: number;
  /** Prazo (horas) para aceitar em "primeiro a aceitar". */
  acceptanceDeadlineH?: number;
  /** Gestor a avisar em falhas de atribuição/SLA. */
  notifyManagerId?: string;
  active: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Respostas e atividade da lead
// ─────────────────────────────────────────────────────────────

export interface LeadAnswer {
  leadId: string;
  questionKey: string;
  label?: string;
  value: string;
  /** Dados pessoais — a mascarar em logs. */
  pii?: boolean;
}

export type LeadActivityType =
  | "created"
  | "assigned"
  | "reassigned"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "note"
  | "stage"
  | "status"
  | "message";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  actorId?: string;
  actorName?: string;
  note?: string;
  from?: string;
  to?: string;
  at: string;
}

// ─────────────────────────────────────────────────────────────
// Pipelines do módulo (Compradores, Proprietários, Recrutamento)
// ─────────────────────────────────────────────────────────────

export type MetaPipelineKey = "compradores" | "proprietarios" | "recrutamento";

export interface MetaPipeline {
  key: MetaPipelineKey;
  label: string;
  stages: string[];
}

export const META_PIPELINES: MetaPipeline[] = [
  {
    key: "compradores",
    label: "Compradores",
    stages: [
      "Nova",
      "Por contactar",
      "Contactada",
      "Qualificada",
      "Imóveis enviados",
      "Visita",
      "Proposta",
      "Negociação",
      "Fechada",
      "Perdida",
      "Nutrição",
    ],
  },
  {
    key: "proprietarios",
    label: "Proprietários",
    stages: [
      "Nova",
      "Por contactar",
      "Contactada",
      "Qualificada",
      "Avaliação",
      "Proposta de serviço",
      "Contrato",
      "Angariação",
      "Perdida",
      "Nutrição",
    ],
  },
  {
    key: "recrutamento",
    label: "Recrutamento",
    stages: [
      "Candidatura",
      "Pré-qualificação",
      "Contactada",
      "Entrevista",
      "Proposta",
      "Onboarding",
      "Contratada",
      "Rejeitada",
      "Banco de talento",
    ],
  },
];

/** Pipeline sugerido a partir do tipo de campanha. */
export function pipelineForCampaignType(t: CampaignType): MetaPipelineKey {
  if (t === "RECRUITMENT") return "recrutamento";
  if (t === "SELLER") return "proprietarios";
  // BUYER, PROPERTY, PROPERTY_SET, INSTITUTIONAL, OTHER → compradores
  return "compradores";
}

// ─────────────────────────────────────────────────────────────
// DADOS DE EXEMPLO (modo demo)
// ─────────────────────────────────────────────────────────────

export const demoMetaConnection: MetaConnection = {
  id: "mc-demo",
  pageId: "000000000000000",
  pageName: "HousePro Imobiliária",
  igId: "000000000000001",
  igName: "housepro.pt",
  tokenRef: undefined, // sem token em demo
  scopes: ["leads_retrieval", "pages_show_list", "pages_manage_metadata"],
  status: "demo",
};

export const demoCampaigns: Campaign[] = [
  {
    id: "cmp-1",
    name: "Compradores Algarve — Verão",
    type: "BUYER",
    ownerType: "AGENCY",
    ownerId: "algarve",
    ownerName: "HousePro Algarve",
    responsibleId: "carla",
    responsibleName: "Carla Sousa",
    objective: "Captar compradores de casa de férias no Algarve.",
    metaCampaignId: "23851234567890000",
    status: "ativa",
    createdAt: "2026-06-01T09:00:00",
  },
  {
    id: "cmp-2",
    name: "Angariação de Moradias — Cascais",
    type: "SELLER",
    ownerType: "AGENCY",
    ownerId: "cascais",
    ownerName: "HousePro Cascais",
    responsibleId: "sofia",
    responsibleName: "Sofia Nunes",
    objective: "Proprietários que querem vender moradia em Cascais.",
    metaCampaignId: "23851234567890001",
    status: "ativa",
    createdAt: "2026-06-10T09:00:00",
  },
  {
    id: "cmp-3",
    name: "Moradia HP-1048 · vista mar",
    type: "PROPERTY",
    ownerType: "AGENT",
    ownerId: "rui",
    ownerName: "Rui Tavares",
    responsibleId: "rui",
    responsibleName: "Rui Tavares",
    objective: "Promoção do imóvel exclusivo com vista mar.",
    metaCampaignId: "23851234567890002",
    status: "ativa",
    createdAt: "2026-07-01T09:00:00",
  },
  {
    id: "cmp-4",
    name: "Recrutamento de Consultores 2026",
    type: "RECRUITMENT",
    ownerType: "AGENCY",
    ownerId: "",
    ownerName: "HousePro (marca)",
    responsibleId: "sudo",
    responsibleName: "Super Admin",
    objective: "Atrair novos consultores para a rede — NÃO entra no comercial.",
    metaCampaignId: "23851234567890003",
    status: "ativa",
    createdAt: "2026-05-20T09:00:00",
  },
];

export const demoCampaignProperties: CampaignProperty[] = [
  { campaignId: "cmp-3", propertyId: "7", propertyRef: "HP-1048" },
];

export const demoLeadForms: LeadForm[] = [
  {
    id: "form-1",
    metaFormId: "700000000000001",
    name: "Compradores Algarve — formulário",
    campaignId: "cmp-1",
    createdAt: "2026-06-01T09:05:00",
    questions: [
      { key: "full_name", label: "Nome completo", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone_number", label: "Telemóvel", type: "phone" },
      {
        key: "budget",
        label: "Orçamento",
        type: "select",
        options: ["até 250k", "250k–500k", "500k–1M", "+1M"],
      },
      {
        key: "zone",
        label: "Zona de interesse",
        type: "select",
        options: ["Albufeira", "Loulé", "Faro", "Lagos", "Tavira"],
      },
      { key: "message", label: "Observações", type: "text" },
    ],
  },
  {
    id: "form-2",
    metaFormId: "700000000000002",
    name: "Angariação Cascais — formulário",
    campaignId: "cmp-2",
    createdAt: "2026-06-10T09:05:00",
    questions: [
      { key: "full_name", label: "Nome", type: "text" },
      { key: "phone_number", label: "Contacto", type: "phone" },
      {
        key: "property_type",
        label: "Tipo de imóvel a vender",
        type: "select",
        options: ["Moradia", "Apartamento", "Terreno"],
      },
      { key: "location", label: "Localização do imóvel", type: "text" },
    ],
  },
  {
    id: "form-3",
    metaFormId: "700000000000003",
    name: "Recrutamento — formulário",
    campaignId: "cmp-4",
    createdAt: "2026-05-20T09:05:00",
    questions: [
      { key: "full_name", label: "Nome", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone_number", label: "Telemóvel", type: "phone" },
      {
        key: "experience",
        label: "Experiência no imobiliário",
        type: "select",
        options: ["Nenhuma", "Menos de 1 ano", "1–3 anos", "+3 anos"],
      },
    ],
  },
];

export const demoFieldMappings: FieldMapping[] = [
  {
    formId: "form-1",
    map: [
      { questionKey: "full_name", leadField: "name" },
      { questionKey: "email", leadField: "email" },
      { questionKey: "phone_number", leadField: "contact" },
      { questionKey: "budget", leadField: "budget" },
      { questionKey: "zone", leadField: "zone" },
      { questionKey: "message", leadField: "message" },
    ],
  },
  {
    formId: "form-2",
    map: [
      { questionKey: "full_name", leadField: "name" },
      { questionKey: "phone_number", leadField: "contact" },
      { questionKey: "property_type", leadField: "custom" },
      { questionKey: "location", leadField: "zone" },
    ],
  },
  {
    formId: "form-3",
    map: [
      { questionKey: "full_name", leadField: "name" },
      { questionKey: "email", leadField: "email" },
      { questionKey: "phone_number", leadField: "contact" },
      { questionKey: "experience", leadField: "custom" },
    ],
  },
];

export const demoAssignmentRules: AssignmentRule[] = [
  // Campanha de compradores: rotação entre Carla e Rui.
  {
    id: "rule-1",
    campaignId: "cmp-1",
    strategy: "round_robin",
    pool: ["carla", "rui"],
    rrIndex: 0,
    active: true,
    createdAt: "2026-06-01T09:10:00",
  },
  // Angariação Cascais: consultor específico (Sofia).
  {
    id: "rule-2",
    campaignId: "cmp-2",
    strategy: "specific",
    agentId: "sofia",
    agentName: "Sofia Nunes",
    active: true,
    createdAt: "2026-06-10T09:10:00",
  },
  // Campanha do imóvel: vai para o angariador do imóvel.
  {
    id: "rule-3",
    campaignId: "cmp-3",
    strategy: "property",
    active: true,
    createdAt: "2026-07-01T09:10:00",
  },
  // Recrutamento: sem responsável automático → inbox.
  {
    id: "rule-4",
    campaignId: "cmp-4",
    strategy: "unassigned",
    active: true,
    createdAt: "2026-05-20T09:10:00",
  },
];

// Helpers de consulta (modo demo) ------------------------------------------

export const campaignById = (id: string): Campaign | undefined =>
  demoCampaigns.find((c) => c.id === id);

export const leadFormById = (id: string): LeadForm | undefined =>
  demoLeadForms.find((f) => f.id === id);

export const leadFormByMetaId = (metaFormId: string): LeadForm | undefined =>
  demoLeadForms.find((f) => f.metaFormId === metaFormId);

export const fieldMappingForForm = (formId: string): FieldMapping | undefined =>
  demoFieldMappings.find((m) => m.formId === formId);

export const assignmentRuleForCampaign = (
  campaignId: string
): AssignmentRule | undefined =>
  demoAssignmentRules.find((r) => r.campaignId === campaignId && r.active);

export const propertiesForCampaign = (campaignId: string): CampaignProperty[] =>
  demoCampaignProperties.filter((cp) => cp.campaignId === campaignId);
