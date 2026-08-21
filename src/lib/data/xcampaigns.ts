/**
 * X Campaigns — email marketing integrado com o CRM.
 *
 * O nome do módulo é sempre "X Campaigns". Cobre campanhas, newsletters,
 * promoção de imóveis, nutrição, etc., com blocos, personalização por variáveis,
 * segmentação sobre os contactos e ENVIO EM SANDBOX (nunca envia emails reais
 * sem autorização e credenciais). Todos os envios ficam na cronologia do contacto.
 */

import type { Contact } from "@/lib/data/contacts";

// ── Tipos de campanha ────────────────────────────────────────────────────────

export type EmailCampaignType =
  | "individual"
  | "campanha"
  | "newsletter"
  | "promocao_imovel"
  | "conjunto_imoveis"
  | "compradores"
  | "proprietarios"
  | "recrutamento"
  | "evento"
  | "open_house"
  | "institucional"
  | "aniversario"
  | "nutricao"
  | "reativacao"
  | "automacao";

export const EMAIL_TYPE_LABEL: Record<EmailCampaignType, string> = {
  individual: "Email individual",
  campanha: "Campanha",
  newsletter: "Newsletter",
  promocao_imovel: "Promoção de imóvel",
  conjunto_imoveis: "Conjunto de imóveis",
  compradores: "Compradores",
  proprietarios: "Proprietários",
  recrutamento: "Recrutamento",
  evento: "Evento",
  open_house: "Open house",
  institucional: "Institucional",
  aniversario: "Aniversário",
  nutricao: "Nutrição",
  reativacao: "Reativação",
  automacao: "Automação",
};

// ── Blocos do editor ─────────────────────────────────────────────────────────

export type EmailBlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "property"
  | "divider"
  | "spacer";

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  text?: string;
  url?: string;
  imageUrl?: string;
  propertyRef?: string;
  align?: "left" | "center" | "right";
}

export const BLOCK_LABEL: Record<EmailBlockType, string> = {
  heading: "Título",
  text: "Texto",
  button: "Botão",
  image: "Imagem",
  property: "Imóvel",
  divider: "Separador",
  spacer: "Espaço",
};

// ── Personalização ───────────────────────────────────────────────────────────

/** Variáveis de personalização disponíveis (mostradas ao utilizador). */
export const MERGE_VARS = [
  "nome",
  "consultor",
  "agencia",
  "imovel",
  "preco",
  "localizacao",
  "link",
  "assinatura",
] as const;

export type MergeVar = (typeof MERGE_VARS)[number];

/**
 * Substitui variáveis {chave} pelo valor do contexto. As não resolvidas ficam
 * como estão (para o utilizador ver o que faltou). Função pura, testável.
 */
export function renderVariables(text: string, ctx: Partial<Record<MergeVar, string>>): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => {
    const v = ctx[key as MergeVar];
    return v != null ? v : m;
  });
}

// ── Segmentação ──────────────────────────────────────────────────────────────

export interface Segment {
  /** Tipo de contacto (comprador, vendedor…). */
  type?: Contact["type"];
  /** Origem (facebook, site, referência…). */
  source?: string;
  agencyId?: string;
  ownerId?: string;
  zone?: string;
  budget?: string;
  /** Etiquetas — todas têm de estar presentes. */
  tags?: string[];
  /** Só contactos sem atividade há N dias (inativos). */
  inactiveDays?: number;
  /** Exige consentimento (RGPD) para comunicações. */
  requireConsent?: boolean;
}

const daysBetween = (iso: string, now: Date): number =>
  (now.getTime() - new Date(iso).getTime()) / 86_400_000;

/** Um contacto pertence ao segmento? Função pura, testável. */
export function matchSegment(contact: Contact, seg: Segment, now: Date = new Date()): boolean {
  if (seg.type && contact.type !== seg.type) return false;
  if (seg.source && (contact.source ?? "").toLowerCase() !== seg.source.toLowerCase()) return false;
  if (seg.agencyId && contact.agencyId !== seg.agencyId) return false;
  if (seg.ownerId && contact.ownerId !== seg.ownerId) return false;
  if (seg.zone && (contact.zone ?? "").toLowerCase() !== seg.zone.toLowerCase()) return false;
  if (seg.budget && (contact.budget ?? "") !== seg.budget) return false;
  if (seg.tags && seg.tags.length) {
    const tags = new Set((contact.tags ?? []).map((t) => t.toLowerCase()));
    if (!seg.tags.every((t) => tags.has(t.toLowerCase()))) return false;
  }
  if (seg.requireConsent && !contact.consent?.base) return false;
  if (seg.inactiveDays != null) {
    const ref = contact.lastActivityAt ?? contact.createdAt;
    if (daysBetween(ref, now) < seg.inactiveDays) return false;
  }
  return true;
}

/** Destinatários de um segmento a partir de uma lista de contactos. */
export function selectRecipients(contacts: Contact[], seg: Segment, now?: Date): Contact[] {
  return contacts.filter((c) => matchSegment(c, seg, now));
}

// ── Envio (sandbox) e estatísticas ───────────────────────────────────────────

export type EmailStatus = "rascunho" | "agendada" | "sandbox" | "enviada";

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

/**
 * Simula o resultado de um envio (SANDBOX) de forma determinística, para o
 * fluxo ser demonstrável sem enviar emails reais. Rácios típicos do setor.
 */
export function simulateSend(recipients: number): EmailStats {
  const r = Math.max(0, Math.round(recipients));
  const bounced = Math.round(r * 0.02);
  const delivered = r - bounced;
  const opened = Math.round(delivered * 0.45);
  const clicked = Math.round(opened * 0.28);
  const unsubscribed = Math.round(delivered * 0.004);
  return { sent: r, delivered, opened, clicked, bounced, unsubscribed };
}

export interface EmailCampaign {
  id: string;
  name: string;
  type: EmailCampaignType;
  subject: string;
  preheader?: string;
  blocks: EmailBlock[];
  segment: Segment;
  status: EmailStatus;
  scheduleAt?: string;
  ownerId: string;
  stats?: EmailStats;
  createdAt: string;
}

// ── Modelos (templates) ──────────────────────────────────────────────────────

export interface EmailTemplate {
  key: string;
  name: string;
  type: EmailCampaignType;
  subject: string;
  blocks: EmailBlock[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: "promo-imovel",
    name: "Promoção de imóvel",
    type: "promocao_imovel",
    subject: "Novo imóvel em {localizacao} que pode ser para si, {nome}",
    blocks: [
      { id: "b1", type: "heading", text: "Acabámos de angariar em {localizacao}" },
      { id: "b2", type: "property", propertyRef: "HP-1048" },
      { id: "b3", type: "text", text: "Olá {nome}, este imóvel encaixa no que procura. Quer visitar?" },
      { id: "b4", type: "button", text: "Marcar visita", url: "{link}" },
      { id: "b5", type: "text", text: "{assinatura}" },
    ],
  },
  {
    key: "newsletter",
    name: "Newsletter mensal",
    type: "newsletter",
    subject: "As novidades do mês — HousePro",
    blocks: [
      { id: "b1", type: "heading", text: "O que se passou este mês" },
      { id: "b2", type: "text", text: "Olá {nome}, aqui vão os destaques do mercado." },
      { id: "b3", type: "divider" },
      { id: "b4", type: "text", text: "{assinatura}" },
    ],
  },
  {
    key: "aniversario",
    name: "Aniversário",
    type: "aniversario",
    subject: "Parabéns, {nome}! 🎉",
    blocks: [
      { id: "b1", type: "heading", text: "Feliz aniversário, {nome}!" },
      { id: "b2", type: "text", text: "Da parte de {consultor} e da {agencia}, um abraço." },
    ],
  },
  {
    key: "reativacao",
    name: "Reativação",
    type: "reativacao",
    subject: "Continuamos à sua procura, {nome}?",
    blocks: [
      { id: "b1", type: "text", text: "Olá {nome}, há algum tempo que não falamos. Ainda procura casa?" },
      { id: "b2", type: "button", text: "Retomar a procura", url: "{link}" },
    ],
  },
];

// ── Demo ─────────────────────────────────────────────────────────────────────

export const demoEmailCampaigns: EmailCampaign[] = [
  {
    id: "ec-1",
    name: "Promoção HP-1048 — compradores Algarve",
    type: "promocao_imovel",
    subject: "Moradia com vista mar em Loulé, {nome}",
    blocks: EMAIL_TEMPLATES[0].blocks,
    segment: { type: "comprador", zone: "Albufeira" },
    status: "sandbox",
    ownerId: "carla",
    stats: { sent: 1, delivered: 1, opened: 1, clicked: 0, bounced: 0, unsubscribed: 0 },
    createdAt: "2026-08-16T10:00:00",
  },
  {
    id: "ec-2",
    name: "Newsletter de agosto",
    type: "newsletter",
    subject: "As novidades do mês — HousePro",
    blocks: EMAIL_TEMPLATES[1].blocks,
    segment: {},
    status: "rascunho",
    ownerId: "rui",
    createdAt: "2026-08-17T09:00:00",
  },
];

export const emailCampaignsByOwner = (ownerId: string): EmailCampaign[] =>
  demoEmailCampaigns
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Contexto de exemplo para a pré-visualização. */
export const previewContext: Partial<Record<MergeVar, string>> = {
  nome: "Helena",
  consultor: "Carla Sousa",
  agencia: "HousePro Algarve",
  imovel: "Moradia T4 com piscina",
  preco: "615 000 €",
  localizacao: "Loulé",
  link: "https://housepro.pt/imovel/7",
  assinatura: "Carla Sousa · HousePro Algarve · 912 000 000",
};
