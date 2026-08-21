import type { Property } from "@/lib/data/types";

/**
 * Desempenho dos imóveis — KPIs ACIONÁVEIS para o consultor saber onde atuar:
 * imóveis com pouca procura, sem contacto, a precisar de revisão de preço, e a
 * qualidade do anúncio. Funções puras e testáveis; a página apenas as apresenta.
 */

export const LOW_DEMAND_INTEREST = 35; // procura (0–100) abaixo disto = fraca
export const NO_CONTACT_DAYS = 7; // sem qualquer lead há mais de X dias
export const REVIEW_DAYS = 45; // muito tempo no mercado → rever preço

export interface PropertyKpi {
  daysOnMarket: number;
  leads: number;
  interest: number;
  lowDemand: boolean;
  noContact: boolean;
  suggestReview: boolean;
  /** Qualidade do anúncio 0–100. */
  adQuality: number;
  adIssues: string[];
}

const daysBetween = (iso: string | undefined, now: Date): number => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
};

/** Qualidade do anúncio: penaliza o que falta (fotos, descrição, media, energia). */
export function adQuality(p: Property): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];
  const galleryLen = p.gallery?.length ?? 0;
  if (galleryLen < 5) {
    score -= 30;
    issues.push(galleryLen === 0 ? "Sem fotografias" : "Poucas fotografias (<5)");
  }
  if (!p.description || p.description.length < 120) {
    score -= 20;
    issues.push("Descrição curta ou em falta");
  }
  if (!p.shortDescription) {
    score -= 10;
    issues.push("Sem frase de destaque");
  }
  if (!p.videoUrl && !p.tourUrl) {
    score -= 15;
    issues.push("Sem vídeo nem tour virtual");
  }
  if (!p.energy) {
    score -= 10;
    issues.push("Sem certificado energético");
  }
  return { score: Math.max(0, score), issues };
}

export function propertyKpi(p: Property, leadCount: number, now: Date = new Date()): PropertyKpi {
  const daysOnMarket = daysBetween(p.listedAt, now);
  const interest = p.interest ?? 0;
  const noContact = leadCount === 0 && daysOnMarket >= NO_CONTACT_DAYS;
  const lowDemand = interest < LOW_DEMAND_INTEREST && daysOnMarket >= NO_CONTACT_DAYS;
  const suggestReview = daysOnMarket >= REVIEW_DAYS && (interest < 40 || leadCount < 2);
  const q = adQuality(p);
  return {
    daysOnMarket,
    leads: leadCount,
    interest,
    lowDemand,
    noContact,
    suggestReview,
    adQuality: q.score,
    adIssues: q.issues,
  };
}

export interface PerfSummary {
  total: number;
  noContact: number;
  lowDemand: number;
  suggestReview: number;
  poorAd: number;
}

/** Resumo acionável sobre um conjunto de imóveis (com contagens de leads). */
export function perfSummary(
  items: { property: Property; leadCount: number }[],
  now: Date = new Date()
): PerfSummary {
  let noContact = 0,
    lowDemand = 0,
    suggestReview = 0,
    poorAd = 0;
  for (const { property, leadCount } of items) {
    const k = propertyKpi(property, leadCount, now);
    if (k.noContact) noContact++;
    if (k.lowDemand) lowDemand++;
    if (k.suggestReview) suggestReview++;
    if (k.adQuality < 60) poorAd++;
  }
  return { total: items.length, noContact, lowDemand, suggestReview, poorAd };
}
