/**
 * Sistema de códigos legíveis da HousePro. Tudo derivado de país + agência +
 * agente, para se poder LER um código e saber a quem pertence (e detetar erros
 * de atribuição), sem depender de sequências aleatórias.
 *
 * Prefixo do agente (7 dígitos, usado nos códigos de afilhado/comissão):
 *   [país:1][agência:2][agente:4]   ex.:  1 · 05 · 0012  →  "1050012"
 *
 * Referência de imóvel (formato próprio, ver buildPropertyReference):
 *   HP<agência><agente 3 díg.>-<sequência 2 díg.>   ex.: "HP1001-01"
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

/**
 * Referência de imóvel — HP<agência><agente 3 díg.>-<sequência 2 díg.>, ex.:
 * "HP1001-01" = 1.º imóvel do agente nº 1 da agência nº 1. Gerada SEMPRE no
 * servidor (ver /api/properties/create), nunca à mão: agencyCode e agentCode
 * vêm da BD (agencies.code / profiles.code) e seq vem de um contador
 * atómico e monótono (profiles.next_property_seq) — nunca duplica, mesmo
 * que um imóvel anterior tenha sido apagado.
 */
export function buildPropertyReference(agencyCode: number, agentCode: number, seq: number): string {
  return `HP${Math.max(0, agencyCode)}${String(Math.max(0, agentCode)).padStart(3, "0")}-${String(Math.max(0, seq)).padStart(2, "0")}`;
}

export interface ParsedHPReference {
  agency: number;
  agent: number;
  seq: number;
  reference: string;
}

/** Lê uma referência "HP<agência><agente 3 díg.>-<seq 2 díg.>". */
export function parsePropertyReference(reference: string): ParsedHPReference | null {
  const m = reference.match(/^HP(\d+)(\d{3})-(\d{2})$/);
  if (!m) return null;
  return { agency: +m[1], agent: +m[2], seq: +m[3], reference };
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
  if (prop) return `Imóvel nº ${prop.seq} do agente ${prop.agent} · agência ${prop.agency}`;
  const pre = parseAgentPrefix(code);
  if (pre) return `Agente ${pre.agent} · agência ${pre.agency} · país ${pre.country}`;
  return "Código não reconhecido";
}
