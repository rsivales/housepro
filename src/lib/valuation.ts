/**
 * Funil público de avaliação de imóvel — lógica pura (sem React), partilhada
 * pelo formulário (cliente) e pela API (servidor): tipos, opções, validação,
 * construção da lead para o Helix, UTMs, deduplicação e atribuição a consultor.
 */

import type { NewLead } from "@/lib/db/repo";
import { publicAgents } from "@/lib/data/mock";

export const FORM_VERSION = "avaliacao-v1";

export const PROPERTY_TYPES = [
  "Apartamento", "Moradia", "Terreno", "Prédio", "Imóvel comercial", "Outro",
] as const;
export const PROPERTY_CONDITIONS = [
  "Novo", "Bom estado", "Usado", "A necessitar de obras", "Em construção", "Outro",
] as const;
export const EVALUATION_REASONS = [
  "Estou a pensar vender", "Quero conhecer o valor", "Partilha ou herança",
  "Mudança de casa", "Investimento", "Outro",
] as const;
export const SELL_TIMEFRAMES = [
  "O mais rapidamente possível", "Nos próximos três meses", "Nos próximos seis meses",
  "Ainda não decidi", "Apenas quero informação",
] as const;
export const CONTACT_PREFERENCES = ["telefone", "whatsapp", "email"] as const;

export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export interface ValuationSubmission {
  // Etapa 1 — Imóvel
  location: string;
  propertyType: string;
  propertyCondition: string;
  // Etapa 2 — Contexto
  typology?: string;
  area?: string;
  bedrooms?: string;
  features?: string;
  reason?: string;
  timeframe?: string;
  // Etapa 3 — Contacto
  name: string;
  email?: string;
  phone?: string;
  contactPreference?: ContactPreference;
  bestTime?: string;
  notes?: string;
  // Consentimentos (separados)
  consent: boolean; // necessário (tratamento + resposta)
  marketingConsent?: boolean; // opcional, nunca pré-selecionado
  // Metadados de campanha/origem (sem dados pessoais)
  pageUrl?: string;
  referrerUrl?: string;
  utm?: Record<string, string>;
  ref?: string; // código/id de consultor (validado)
  language?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d][\d\s()-]{6,}$/;

export function isValidEmail(v?: string): boolean {
  return !!v && EMAIL_RE.test(v.trim());
}
export function isValidPhone(v?: string): boolean {
  return !!v && PHONE_RE.test(v.trim());
}

/** Validação por etapa (0,1,2). Devolve mapa de erros por campo. */
export function validateStep(step: number, s: Partial<ValuationSubmission>): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!s.location?.trim()) e.location = "Indique a localização do imóvel.";
    if (!s.propertyType) e.propertyType = "Selecione o tipo de imóvel.";
    if (!s.propertyCondition) e.propertyCondition = "Selecione o estado do imóvel.";
  }
  if (step === 2) {
    if (!s.name?.trim()) e.name = "Indique o seu nome.";
    if (!isValidEmail(s.email) && !isValidPhone(s.phone)) {
      e.contact = "Deixe pelo menos um contacto válido (email ou telefone) — a avaliação é entregue por um consultor.";
    }
    if (!s.consent) e.consent = "É necessário o seu consentimento para tratarmos o pedido.";
  }
  return e;
}

/** Validação completa (servidor). */
export function validateSubmission(s: Partial<ValuationSubmission>): Record<string, string> {
  return { ...validateStep(0, s), ...validateStep(2, s) };
}

/** Extrai UTMs e click-ids de uma query string, sem dados pessoais. */
export function parseCampaign(search: string): Record<string, string> {
  const p = new URLSearchParams(search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = p.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}

/**
 * Resolve o consultor a partir do ?ref, validando-o contra a lista real.
 * Nunca aceita ids arbitrários (evita atribuições indevidas).
 */
export function resolveConsultant(ref?: string): string | undefined {
  if (!ref) return undefined;
  // Verificação de EXISTÊNCIA real (não usar agentById, que devolve um default
  // para ids desconhecidos e permitiria atribuições indevidas).
  return publicAgents.some((a) => a.id === ref) ? ref : undefined;
}

/** Chave de deduplicação (nome + contacto + localização, normalizados). */
export function dedupeKey(s: Partial<ValuationSubmission>): string {
  const norm = (v?: string) => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return [norm(s.name), norm(s.email || s.phone), norm(s.location)].join("|");
}

/** Resumo legível para a cronologia da lead no Helix. */
export function summarize(s: ValuationSubmission): string {
  const L = (label: string, v?: string) => (v ? `${label}: ${v}` : null);
  return [
    `Pedido de avaliação — ${s.propertyType}, ${s.propertyCondition}`,
    L("Localização", s.location),
    L("Tipologia", s.typology),
    L("Área", s.area ? `${s.area} m²` : undefined),
    L("Quartos", s.bedrooms),
    L("Características", s.features),
    L("Motivo", s.reason),
    L("Prazo", s.timeframe),
    L("Preferência de contacto", s.contactPreference),
    L("Melhor horário", s.bestTime),
    L("Observações", s.notes),
  ].filter(Boolean).join("\n");
}

/**
 * Constrói a lead para o Helix a partir da submissão. Atribui à origem
 * Website / suborigem Avaliação de imóvel, pipeline de proprietários, e ao
 * consultor validado (?ref) ou ao inbox de distribuição.
 */
export function buildLead(s: ValuationSubmission): NewLead {
  const consultant = resolveConsultant(s.ref);
  const contact = (isValidPhone(s.phone) ? s.phone : s.email) ?? s.email ?? s.phone ?? "";
  return {
    ownerId: consultant ?? "",
    assignedAgentId: consultant,
    unassigned: !consultant,
    referrerId: consultant,
    name: s.name.trim(),
    contact: contact.trim(),
    email: s.email?.trim() || undefined,
    intent: "custos", // avaliação de imóvel
    source: "site",
    subSource: "Avaliação de imóvel",
    pipeline: "proprietarios",
    stage: 0,
    qualification: "novo",
    zone: s.location?.trim(),
    language: s.language,
    message: summarize(s),
    propertyType: s.propertyType,
    propertyCondition: s.propertyCondition,
    evaluationReason: s.reason,
    sellTimeframe: s.timeframe,
    contactPreference: s.contactPreference,
    bestTime: s.bestTime,
    marketingConsent: !!s.marketingConsent,
    formVersion: FORM_VERSION,
    pageUrl: s.pageUrl,
    referrerUrl: s.referrerUrl,
    utm: s.utm && Object.keys(s.utm).length ? s.utm : undefined,
    consent: {
      base: "consentimento",
      at: new Date().toISOString(),
      text: "Tratamento dos dados para resposta ao pedido de avaliação (RGPD).",
    },
  };
}
