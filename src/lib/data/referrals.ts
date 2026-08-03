import { agencies, agentById } from "./mock";

/** Referências (partilha de leads) — sempre em PERCENTAGEM, transparente. */

export type ReferralType = "consultor" | "cliente";
export type ReferralStatus = "pendente" | "contraproposta" | "ativa" | "rejeitada";

/** % mínimas garantidas a quem faz a referência. */
export const MIN_CONSULTOR_PCT = 25;
export const MIN_CLIENTE_PCT = 10;

export interface Referral {
  id: string;
  type: ReferralType;
  /** Imóvel associado (quando aplicável). */
  propertyId?: string;
  propertyRef?: string;
  propertyTitle?: string;
  /** Quem envia a referência. Para type=cliente, o nome do cliente. */
  fromId: string;
  fromName: string;
  /** Contacto de quem refere (type=cliente) — para acompanhar e recompensar. */
  fromContact?: string;
  /** Objetivo do contacto indicado. */
  purpose?: "comprar" | "vender";
  /** Consultor destino (type=consultor). */
  toId?: string;
  toName?: string;
  /** Agência destino (type=cliente — distribuída pela zona). */
  agencyId?: string;
  agencyName?: string;
  /** Contacto do cliente a ser seguido. */
  clientName: string;
  clientContact: string;
  /** % do valor da venda/comissão que fica para quem referiu (proposta atual). */
  sharePct: number;
  /** Referência de/para um consultor internacional (fora de Portugal). */
  international?: boolean;
  /** País do consultor/entidade internacional. */
  country?: string;
  /** Nota fiscal internacional — regras de impostos a aplicar (retenção,
   *  IVA/reverse charge, dupla tributação), indicada no momento da submissão. */
  taxNote?: string;
  /** Quem fez a proposta atual — para saber de quem se espera resposta. */
  proposedBy: "origem" | "destino";
  note?: string;
  status: ReferralStatus;
  createdAt: string;
}

/** Distribui uma referência de cliente pela agência da zona geográfica. */
export function agencyForMunicipality(municipality: string): string {
  const m = municipality.toLowerCase();
  const ALGARVE = ["albufeira", "faro", "loulé", "loule", "portimão", "portimao", "lagos", "tavira", "olhão", "olhao", "silves", "são brás", "sao bras"];
  if (ALGARVE.some((x) => m.includes(x))) return "algarve";
  if (m.includes("porto")) return "porto";
  if (m.includes("cascais")) return "cascais";
  if (m.includes("braga")) return "braga";
  if (m.includes("lisboa")) return "lisboa";
  // Fallback: primeira agência.
  return agencies[0].id;
}

export const REFERRAL_STATUS: Record<ReferralStatus, { label: string; badge: string; dot: string }> = {
  pendente: {
    label: "Pendente",
    badge: "bg-gold/15 text-gold-foreground",
    dot: "bg-amber-500",
  },
  contraproposta: {
    label: "Contraproposta",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  ativa: {
    label: "Ativa",
    badge: "bg-primary/15 text-primary",
    dot: "bg-primary",
  },
  rejeitada: {
    label: "Rejeitada",
    badge: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
};

/** Referências de exemplo (modo demo) — em torno do consultor Rui. */
export const mockReferrals: Referral[] = [
  {
    id: "ref-1",
    type: "consultor",
    propertyId: "3",
    propertyRef: "HP-1044",
    propertyTitle: "Apartamento renovado no coração da Baixa",
    fromId: "ana",
    fromName: "Ana Marques",
    toId: "rui",
    toName: "Rui Tavares",
    clientName: "Helena Dias",
    clientContact: "351962111222",
    sharePct: 25,
    proposedBy: "origem",
    note: "Cliente conheci em Lisboa mas quer comprar no Porto.",
    status: "pendente",
    createdAt: "2026-07-21T14:10:00",
  },
  {
    id: "ref-2",
    type: "consultor",
    propertyId: "7",
    propertyRef: "HP-1048",
    propertyTitle: "Moradia de luxo com vista mar e piscina",
    fromId: "rui",
    fromName: "Rui Tavares",
    toId: "carla",
    toName: "Carla Sousa",
    clientName: "Family Oliveira",
    clientContact: "351915333444",
    sharePct: 30,
    proposedBy: "destino",
    note: "Investidores, orçamento até 3M no Algarve.",
    status: "ativa",
    createdAt: "2026-07-19T09:30:00",
  },
  {
    id: "ref-3",
    type: "consultor",
    propertyId: "6",
    propertyRef: "HP-1047",
    propertyTitle: "Apartamento para arrendar com varanda",
    fromId: "miguel",
    fromName: "Miguel Costa",
    toId: "rui",
    toName: "Rui Tavares",
    clientName: "Pedro Nunes",
    clientContact: "351919777888",
    sharePct: 35,
    proposedBy: "destino",
    note: "Contraproposta enviada — aguardo o Miguel.",
    status: "contraproposta",
    createdAt: "2026-07-20T16:45:00",
  },
  {
    id: "ref-4",
    type: "cliente",
    fromId: "cliente",
    fromName: "Cliente: João Ferreira",
    agencyId: "algarve",
    agencyName: "HousePro Algarve",
    clientName: "Marta e Rui (amigos)",
    clientContact: "351968222333",
    sharePct: 10,
    proposedBy: "origem",
    note: "Amigos a comprar casa de férias em Albufeira.",
    status: "pendente",
    createdAt: "2026-07-21T11:00:00",
  },
];

export const referralsIncoming = (consultantId: string): Referral[] =>
  mockReferrals
    .filter((r) => r.toId === consultantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const referralsOutgoing = (consultantId: string): Referral[] =>
  mockReferrals
    .filter((r) => r.fromId === consultantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Registo completo para gestor/admin (opcionalmente filtrado por agência). */
export const allReferrals = (agencyId?: string): Referral[] => {
  const withAgency = (r: Referral): boolean => {
    if (!agencyId) return true;
    if (r.agencyId) return r.agencyId === agencyId;
    // consultor→consultor: pertence à agência de origem ou destino
    return [r.fromId, r.toId].some(
      (id) => id && id !== "cliente" && agentById(id).agencyId === agencyId
    );
  };
  return mockReferrals
    .filter(withAgency)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// ── Acompanhamento da indicação (portal de quem referiu) ────────────────────

/** Passos do acompanhamento de uma indicação de cliente, do contacto ao fecho. */
export const REFERRAL_TRACK_STEPS = [
  "Indicação recebida",
  "Atribuída a consultor",
  "Primeiro contacto",
  "Reunião agendada",
  "Proposta / contrato (CPCV)",
  "Escritura concluída",
] as const;

export type ReferralTrackStep = (typeof REFERRAL_TRACK_STEPS)[number];

export interface TrackedReferral {
  id: string;
  /** Quem referiu (dono deste acompanhamento). */
  referrerName: string;
  referrerContact: string;
  /** Contacto indicado. */
  clientName: string;
  purpose: "comprar" | "vender";
  zone?: string;
  sharePct: number;
  /** Consultor a quem foi atribuída. */
  agentId?: string;
  agentName?: string;
  agencyName?: string;
  /** Índice do passo atual (0..REFERRAL_TRACK_STEPS.length-1). */
  currentStep: number;
  /** Eventos já concretizados (data por passo). */
  events: { step: number; at: string; note?: string }[];
  /** Comissão estimada e recompensa quando fechar (€). */
  estimatedReward?: number;
}

/** Indicação demo acompanhada (exemplo no portal de quem refere). */
export const demoTrackedReferrals: TrackedReferral[] = [
  {
    id: "trk-1",
    referrerName: "Você",
    referrerContact: "voce@email.pt",
    clientName: "João (amigo)",
    purpose: "comprar",
    zone: "Cascais",
    sharePct: 10,
    agentId: "rui",
    agentName: "Rui Almeida",
    agencyName: "HousePro Cascais",
    currentStep: 3,
    events: [
      { step: 0, at: "2026-07-20T10:00:00", note: "Indicação recebida e validada." },
      { step: 1, at: "2026-07-20T15:30:00", note: "Atribuída ao consultor Rui Almeida." },
      { step: 2, at: "2026-07-21T11:10:00", note: "Primeiro contacto telefónico." },
      { step: 3, at: "2026-07-24T16:00:00", note: "Visita agendada para 28/07." },
    ],
    estimatedReward: 900,
  },
];
