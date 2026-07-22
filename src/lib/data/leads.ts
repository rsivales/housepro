export type LeadSource = "site" | "whatsapp" | "facebook" | "portal" | "consultor";
export type LeadIntent = "mensagem" | "visita" | "custos";
export type LeadStatus = "novo" | "contactado" | "agendado" | "perdido" | "convertido";

export interface Lead {
  id: string;
  propertyId?: string;
  propertyRef?: string;
  /** Consultor que fica com o contacto (referrer, ou angariador). */
  ownerId: string;
  /** Consultor que trouxe o cliente (?ref), quando diferente do angariador. */
  referrerId?: string;
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
];

export const leadsByOwner = (ownerId: string): Lead[] =>
  mockLeads
    .filter((l) => l.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contactado: "Contactado",
  agendado: "Visita agendada",
  perdido: "Perdido",
  convertido: "Convertido",
};
