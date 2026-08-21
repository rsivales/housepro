/**
 * LegalFlow — plataforma jurídica comum a advogado, coordenação, consultor e
 * cliente. O advogado constrói o CPCV (ou arrendamento, procuração, etc.) online
 * e os restantes acompanham em tempo real, à medida que ele partilha o
 * documento. Menos atrasos, menos atritos, menos erros.
 */

export type LegalDocType = "cpcv" | "arrendamento" | "procuracao" | "consulta" | "outro";
export type LegalStatus = "normal" | "pendencias" | "bloqueado" | "concluido";
export type LegalPartyRole = "advogado" | "coordenacao" | "consultor" | "vendedor" | "comprador";

export const DOC_TYPE_LABEL: Record<LegalDocType, string> = {
  cpcv: "CPCV",
  arrendamento: "Contrato de arrendamento",
  procuracao: "Procuração",
  consulta: "Consulta jurídica",
  outro: "Documento",
};

/** Honorários e modo de pagamento de um serviço jurídico. */
export type PaymentMethod = "transferencia" | "mbway" | "multibanco" | "numerario" | "outro";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transferencia: "Transferência bancária",
  mbway: "MB WAY",
  multibanco: "Multibanco",
  numerario: "Numerário",
  outro: "Outro",
};

export type FeeStatus = "por_pagar" | "pago" | "isento";

export interface LegalFee {
  amount: number;
  method: PaymentMethod;
  status: FeeStatus;
  note?: string;
}

export const STATUS_LABEL: Record<LegalStatus, { label: string; dot: string; badge: string }> = {
  normal: { label: "Normal", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  pendencias: { label: "Pendências", dot: "bg-amber-500", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  bloqueado: { label: "Bloqueado", dot: "bg-destructive", badge: "bg-destructive/15 text-destructive" },
  concluido: { label: "Concluído", dot: "bg-primary", badge: "bg-primary/15 text-primary" },
};

export const PARTY_ROLE_LABEL: Record<LegalPartyRole, string> = {
  advogado: "Advogado",
  coordenacao: "Coordenação",
  consultor: "Consultor",
  vendedor: "Vendedor",
  comprador: "Comprador",
};

export interface LegalParty { id: string; name: string; role: LegalPartyRole }
export interface LegalAlert { level: "aviso" | "critico"; text: string }
export interface LegalActivity { id: string; actorName: string; action: string; when: string }
export interface LegalSection { id: string; title: string; body: string }
export interface ChecklistItem { id: string; label: string; done: boolean }

export interface LegalProcess {
  id: string;
  ref: string;
  title: string;
  address: string;
  type: LegalDocType;
  typeNote: string;
  status: LegalStatus;
  progress: number;
  parties: LegalParty[];
  alerts: LegalAlert[];
  activity: LegalActivity[];
  nextSignature?: { entity: string; date: string };
  financial: { pipeline: number; extras: number; pending: number };
  docVersion: number;
  sections: LegalSection[];
  checklist: ChecklistItem[];
  updatedAt: string;
  /** Honorários e pagamento definidos pelo advogado. */
  fee?: LegalFee;
  /** O cliente pode pré-visualizar a minuta? (o advogado ativa/desativa). */
  clientVisible?: boolean;
}

/** Cláusulas por defeito de cada tipo de documento (o advogado preenche). */
export function templateSections(type: LegalDocType): LegalSection[] {
  const mk = (title: string): LegalSection => ({ id: `s-${Math.random().toString(36).slice(2, 7)}`, title, body: "" });
  if (type === "cpcv") {
    return ["Identificação das partes", "Identificação do imóvel", "Preço e forma de pagamento", "Sinal e reforços", "Prazo para a escritura", "Condições e cláusulas especiais", "Foro e disposições finais"].map(mk);
  }
  if (type === "arrendamento") {
    return ["Identificação das partes", "Identificação do locado", "Prazo e renovação", "Renda e atualização", "Caução", "Obrigações das partes", "Disposições finais"].map(mk);
  }
  if (type === "procuracao") {
    return ["Identificação do mandante", "Identificação do procurador", "Poderes conferidos", "Prazo e validade", "Disposições finais"].map(mk);
  }
  if (type === "consulta") {
    return ["Questão colocada", "Enquadramento jurídico", "Análise", "Parecer / recomendação"].map(mk);
  }
  return [mk("Introdução"), mk("Cláusulas"), mk("Disposições finais")];
}

// ── Configuração do advogado (honorários, serviços, pagamento) ──────────────

export interface LawyerService {
  type: LegalDocType;
  label: string;
  /** Honorário base (€). */
  basePrice: number;
  /** Prazo de entrega padrão (dias). */
  deadlineDays: number;
  active: boolean;
}

export interface LawyerConfig {
  services: LawyerService[];
  /** Métodos de pagamento aceites. */
  methods: PaymentMethod[];
  /** Nota/condições gerais (mostradas ao consultor ao pedir). */
  note?: string;
}

export const DEFAULT_LAWYER_CONFIG: LawyerConfig = {
  services: [
    { type: "cpcv", label: "CPCV", basePrice: 250, deadlineDays: 5, active: true },
    { type: "arrendamento", label: "Contrato de arrendamento", basePrice: 150, deadlineDays: 4, active: true },
    { type: "procuracao", label: "Procuração", basePrice: 90, deadlineDays: 2, active: true },
    { type: "consulta", label: "Consulta jurídica", basePrice: 60, deadlineDays: 2, active: true },
    { type: "outro", label: "Outro documento", basePrice: 120, deadlineDays: 5, active: true },
  ],
  methods: ["transferencia", "mbway", "multibanco"],
  note: "Honorários acrescidos de IVA à taxa legal. Prazo conta a partir da receção de todos os documentos.",
};

/** Honorário/serviço configurado para um tipo. */
export function serviceFor(config: LawyerConfig, type: LegalDocType): LawyerService | undefined {
  return config.services.find((s) => s.type === type && s.active);
}

/** Navegação do LegalFlow por papel (espelha as permissões definidas). */
export const LEGAL_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/app/legalflow" },
  { key: "processos", label: "Processos", href: "/app/legalflow" },
  { key: "novo", label: "Novo processo", href: "/app/legalflow?novo=1" },
] as const;

/** Processos de exemplo (espelham o protótipo LegalFlow). */
export const demoProcesses: LegalProcess[] = [
  {
    id: "cpcv-2024-001",
    ref: "CPCV-2024-001",
    title: "Apartamento T3 Cascais — Dubois / Schmidt",
    address: "Apartamento T3 — Rua das Flores 42, 3.º Dto",
    type: "cpcv",
    typeNote: "CPCV com procuração estrangeira",
    status: "bloqueado",
    progress: 58,
    parties: [
      { id: "beatriz", name: "Dra. Beatriz Lopes", role: "advogado" },
      { id: "sofia", name: "Sofia Nunes", role: "coordenacao" },
      { id: "rui", name: "Rui Tavares", role: "consultor" },
      { id: "c1", name: "M. Dubois", role: "comprador" },
      { id: "v1", name: "K. Schmidt", role: "vendedor" },
    ],
    alerts: [
      { level: "critico", text: "Tradução certificada da procuração emitida em França ainda não recebida. Certidão permanente a expirar em 5 dias." },
    ],
    activity: [
      { id: "a1", actorName: "Dr. Miguel", action: "validou a certidão predial", when: "há 2h" },
      { id: "a2", actorName: "Thomas", action: "carregou comprovativo bancário", when: "há 4h" },
      { id: "a3", actorName: "Dra. Beatriz", action: "criou o CPCV v1", when: "há 1d" },
    ],
    financial: { pipeline: 2600, extras: 300, pending: 200 },
    docVersion: 1,
    sections: templateSections("cpcv"),
    checklist: [
      { id: "d1", label: "Certidão permanente do registo predial", done: true },
      { id: "d2", label: "Caderneta predial", done: true },
      { id: "d3", label: "Procuração (tradução certificada)", done: false },
      { id: "d4", label: "Comprovativo do sinal", done: false },
    ],
    updatedAt: "2026-08-06T09:00:00",
  },
  {
    id: "cpcv-2024-002",
    ref: "CPCV-2024-002",
    title: "Moradia T4 Sintra — Santos / Pereira",
    address: "Moradia T4 — Av. da República 115",
    type: "cpcv",
    typeNote: "CPCV simples com inventário",
    status: "pendencias",
    progress: 33,
    parties: [
      { id: "beatriz", name: "Dra. Beatriz Lopes", role: "advogado" },
      { id: "rui", name: "Rui Tavares", role: "consultor" },
      { id: "c2", name: "A. Santos", role: "comprador" },
      { id: "v2", name: "J. Pereira", role: "vendedor" },
    ],
    alerts: [{ level: "aviso", text: "Falta o inventário de bens móveis assinado pelas partes." }],
    activity: [{ id: "a1", actorName: "Maria", action: "respondeu ao questionário", when: "há 1d" }],
    financial: { pipeline: 1950, extras: 250, pending: 230 },
    docVersion: 1,
    sections: templateSections("cpcv"),
    checklist: [
      { id: "d1", label: "Certidão permanente", done: true },
      { id: "d2", label: "Inventário de bens móveis", done: false },
      { id: "d3", label: "Licença de utilização", done: false },
    ],
    updatedAt: "2026-08-05T15:00:00",
  },
  {
    id: "cpcv-2024-003",
    ref: "CPCV-2024-003",
    title: "Loja Comercial Lisboa — Santos / Schmidt",
    address: "Loja — Rua Augusta 78, R/C",
    type: "cpcv",
    typeNote: "CPCV com financiamento",
    status: "normal",
    progress: 92,
    parties: [
      { id: "beatriz", name: "Dra. Beatriz Lopes", role: "advogado" },
      { id: "sofia", name: "Sofia Nunes", role: "coordenacao" },
      { id: "ana", name: "Ana Marques", role: "consultor" },
    ],
    alerts: [],
    activity: [{ id: "a1", actorName: "Dra. Beatriz", action: "partilhou o CPCV v3 para assinatura", when: "há 3h" }],
    nextSignature: { entity: "Conservatória do Registo Predial de Lisboa", date: "2026-12-20" },
    financial: { pipeline: 2000, extras: 200, pending: 0 },
    docVersion: 3,
    sections: templateSections("cpcv"),
    checklist: [
      { id: "d1", label: "Aprovação de crédito (banco)", done: true },
      { id: "d2", label: "Certidão permanente", done: true },
      { id: "d3", label: "Distrate de hipoteca anterior", done: true },
    ],
    updatedAt: "2026-08-06T06:00:00",
  },
];

export function processById(id: string): LegalProcess | undefined {
  return demoProcesses.find((p) => p.id === id);
}
