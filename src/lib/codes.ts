/**
 * Sistema de códigos legíveis da HousePro. Tudo derivado de país + agência +
 * agente, para se poder LER um código e saber a quem pertence (e detetar erros
 * de atribuição), sem depender de sequências aleatórias.
 *
 * Prefixo do agente (7 dígitos, usado nos códigos de afilhado/comissão):
 *   [país:1][agência:2][agente:4]   ex.:  1 · 05 · 0012  →  "1050012"
 *
 * Referência de imóvel (formato próprio, ver buildPropertyReference):
 *   HP<agência><cidade><agente 2 díg.>-<sequência 2+ díg.>   ex.: "HP1101-406"
 *
 * Código de afilhado (relativo ao agente-raiz):
 *   <prefixo>A<geração>G<posição>    ex.:  "1050012A1G3" (3.º afilhado direto)
 *                                          "1050012A2G5" (5.º da 2.ª geração)
 */

/** Índice de país (Portugal = 1; expansível para internacional). */
export const COUNTRY = { PT: 1 } as const;

export function agencyPart(code: number): string {
  return String(Math.max(0, code)).padStart(2, "0").slice(-2);
}
export function agentPart(code: number): string {
  return String(Math.max(0, code)).padStart(4, "0").slice(-4);
}

/** Prefixo de 7 dígitos do agente. */
export function agentPrefix(country: number, agencyCode: number, agentCode: number): string {
  return `${country}${agencyPart(agencyCode)}${agentPart(agentCode)}`;
}

/** HousePro: agency + city + two-digit consultant, then a growing sequence.
 * City 1 is Faro; imported references remain unchanged after reassignment.
 * Allocation happens inside the database transaction, never in the browser.
 */
export function buildPropertyReference(agencyCode: number, agentCode: number, seq: number, cityCode = 1): string {
  if (!Number.isSafeInteger(seq) || seq < 1) throw new Error("Invalid property sequence");
  return `${consultantCode(agencyCode, agentCode, cityCode)}-${String(seq).padStart(2, "0")}`;
}
export function consultantCode(agencyCode: number, agentCode: number, cityCode = 1): string {
  if (!Number.isInteger(agencyCode) || agencyCode < 1 || !Number.isInteger(cityCode) || cityCode < 1 || cityCode > 9 || !Number.isInteger(agentCode) || agentCode < 1 || agentCode > 99) throw new Error("Invalid HousePro reference codes");
  return `HP${agencyCode}${cityCode}${String(agentCode).padStart(2, "0")}`;
}
export interface ParsedHPReference {
  agency: number;
  city: number;
  agent: number;
  seq: number;
  reference: string;
}
export function parsePropertyReference(reference: string): ParsedHPReference | null {
  const m = reference.match(/^HP([1-9]\d*)([1-9])(\d{2})-(\d{2,})$/);
  if (!m || Number(m[3]) < 1) return null;
  return { agency: +m[1], city: +m[2], agent: +m[3], seq: +m[4], reference };
}

/** Código de um afilhado, relativo ao agente-raiz. */
export function affiliateCode(rootPrefix: string, generation: number, position: number): string {
  return `${rootPrefix}A${generation}G${position}`;
}

// ── Leitores (para organizar/contabilizar e apanhar erros) ──────────────────

export interface ParsedPrefix {
  country: number;
  agency: number;
  agent: number;
  prefix: string;
}

export function parseAgentPrefix(prefix: string): ParsedPrefix | null {
  const m = prefix.match(/^(\d)(\d{2})(\d{4})$/);
  if (!m) return null;
  return { country: +m[1], agency: +m[2], agent: +m[3], prefix };
}

export interface ParsedAffiliateCode extends ParsedPrefix {
  generation: number;
  position: number;
}

export function parseAffiliateCode(code: string): ParsedAffiliateCode | null {
  const m = code.toUpperCase().match(/^(\d{7})A(\d+)G(\d+)$/);
  if (!m) return null;
  const p = parseAgentPrefix(m[1]);
  return p ? { ...p, generation: +m[2], position: +m[3] } : null;
}

/** Descrição legível de um código (para diagnóstico). */
export function describeCode(code: string): string {
  const aff = parseAffiliateCode(code);
  if (aff) return `Afilhado da ${aff.generation}.ª geração (nº ${aff.position}) do agente ${aff.agent} · agência ${aff.agency}`;
  const prop = parsePropertyReference(code);
  if (prop) return `Imóvel nº ${prop.seq} do agente ${prop.agent} · agência ${prop.agency} · cidade ${prop.city}`;
  const pre = parseAgentPrefix(code);
  if (pre) return `Agente ${pre.agent} · agência ${pre.agency} · país ${pre.country}`;
  return "Código não reconhecido";
}
