/**
 * Imóveis EXCLUSIVOS / luxury com página dedicada.
 *
 * Uma página exclusiva não se atribui à vontade: cumpre CRITÉRIOS de
 * singularidade e valor comprovado (ou um compromisso de comissão mais alta
 * devidamente justificado). Este módulo define e verifica esses critérios, para
 * que o selo "Exclusivo" seja sempre merecido.
 */

import type { Property } from "@/lib/data/types";

/** Valor a partir do qual o imóvel é elegível por valor. */
export const EXCLUSIVE_MIN_PRICE = 1_000_000;
/** Comissão a partir da qual há "compromisso" reforçado. */
export const EXCLUSIVE_MIN_COMMISSION_PCT = 6;

export interface ExclusiveCriteria {
  /** Valor comprovado (preço elevado + documentação de suporte). */
  value: boolean;
  /** Singularidade (nota de singularidade ou tipologia/atributos raros). */
  singularity: boolean;
  /** Valor comprovado por documentação (caderneta, certidão, energético). */
  proof: boolean;
  /** Compromisso de comissão mais alta, justificado. */
  commitment: boolean;
}

export interface ExclusiveEligibility {
  eligible: boolean;
  criteria: ExclusiveCriteria;
  reasons: string[];
  /** Critérios em falta (para orientar quem propõe). */
  missing: string[];
}

const REQUIRED_DOCS = ["caderneta", "certidao_predial", "cert_energetico"];

/**
 * Avalia se um imóvel pode ter página exclusiva. Regra: precisa de
 * SINGULARIDADE **e** VALOR COMPROVADO. O valor comprova-se por preço elevado
 * ou por um compromisso de comissão mais alta justificado — sempre com
 * documentação de suporte.
 */
export function exclusiveEligibility(p: Property): ExclusiveEligibility {
  const docs = p.documents ?? [];
  const proof = REQUIRED_DOCS.every((d) => docs.includes(d));
  const value = p.price >= EXCLUSIVE_MIN_PRICE;
  const commitment =
    (p.commissionType !== "fixed" && (p.commissionPct ?? 0) >= EXCLUSIVE_MIN_COMMISSION_PCT) &&
    Boolean(p.commissionJustification);
  const singularity =
    Boolean(p.singularityNote?.trim()) ||
    Boolean(p.exclusiveTagline?.trim()) ||
    (p.type === "Moradia" && (p.landArea ?? 0) >= 800);

  // Valor comprovado = (preço alto OU compromisso de comissão) COM documentação.
  const valueProven = (value || commitment) && proof;
  const eligible = singularity && valueProven;

  const criteria: ExclusiveCriteria = { value, singularity, proof, commitment };
  const reasons: string[] = [];
  if (value) reasons.push(`Valor elevado (≥ ${(EXCLUSIVE_MIN_PRICE / 1_000_000).toFixed(0)}M€)`);
  if (commitment) reasons.push(`Compromisso de comissão (≥ ${EXCLUSIVE_MIN_COMMISSION_PCT}%) justificado`);
  if (singularity) reasons.push("Singularidade comprovada");
  if (proof) reasons.push("Documentação de suporte completa");

  const missing: string[] = [];
  if (!singularity) missing.push("Sem nota de singularidade / atributos raros");
  if (!value && !commitment) missing.push("Sem valor elevado nem compromisso de comissão justificado");
  if (!proof) missing.push("Documentação de suporte incompleta (caderneta, certidão, energético)");

  return { eligible, criteria, reasons, missing };
}
