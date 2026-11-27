export type BuyerProfile = {
  budgetMax?: number;
  zones?: string[];
  typologies?: string[];
  urgency?: "baixa" | "media" | "alta";
  timeframeMonths?: number;
  hasHomeToSell?: boolean;
  hasHomeToExchange?: boolean;
  dependsOnSale?: boolean;
  financing?: "capitais_proprios" | "aprovado" | "em_analise" | "por_iniciar";
  purpose?: "habitacao" | "investimento" | "segunda_habitacao";
  flexibilityPct?: number;
  broadenZone?: boolean;
  needs?: string;
  nextContactAt?: string;
  active?: boolean;
  matchEmails?: boolean;
};
export function buyerTemperature(p: BuyerProfile = {}) {
  if (!p.timeframeMonths) return "por_qualificar";
  return p.timeframeMonths <= 3 ? "quente" : p.timeframeMonths <= 6 ? "morno" : "frio";
}
export const TEMPERATURE_LABEL = { por_qualificar: "Por qualificar", quente: "Quente · até 3 meses", morno: "Morno · 4–6 meses", frio: "Frio · mais de 6 meses" };
/** Hash puro em JS (sem node:crypto) para funcionar tanto no cliente como no servidor. */
function shortHash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
/** Referência curta (6 dígitos) e legível para a qualificação de um contacto —
 *  só para identificação humana (ex.: ao telefone); o acesso real é sempre
 *  pela ficha do contacto (RLS), nunca por esta referência. */
export function qualificationRef(id: string) { return `CQ-${String(shortHash(id) % 1000000).padStart(6, "0")}`; }
/** One allowlist for manual edits and OCR suggestions. No implicit yes/no or budget inference. */
export function validateBuyerProfile(value: unknown): BuyerProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Qualificação inválida.");
  const v = value as Record<string, unknown>, p: BuyerProfile = {};
  for (const key of ["budgetMax", "timeframeMonths", "flexibilityPct"] as const) if (v[key] != null && v[key] !== "") {
    const n = v[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || (key === "budgetMax" && n > 1e10) || (key === "timeframeMonths" && (!Number.isInteger(n) || n > 120)) || (key === "flexibilityPct" && (n < 30 || n > 40))) throw new Error(`Valor inválido: ${key}.`);
    p[key] = n;
  }
  for (const key of ["zones", "typologies"] as const) if (v[key] != null) {
    if (!Array.isArray(v[key]) || v[key].length > 20 || v[key].some((x: unknown) => typeof x !== "string" || x.length > 150)) throw new Error("Zonas ou tipologias inválidas.");
    p[key] = [...new Set((v[key] as string[]).map(s => s.trim()).filter(Boolean))];
    if (key === "typologies" && p[key]!.some(s => !/^T\d{1,2}(\+\d)?$/i.test(s))) throw new Error("Use tipologias como T0, T2 ou T3.");
  }
  for (const key of ["hasHomeToSell", "hasHomeToExchange", "dependsOnSale", "broadenZone", "active", "matchEmails"] as const) if (v[key] != null) {
    if (typeof v[key] !== "boolean") throw new Error("Opção inválida."); p[key] = v[key];
  }
  const enums = { urgency: ["baixa","media","alta"], financing: ["capitais_proprios","aprovado","em_analise","por_iniciar"], purpose: ["habitacao","investimento","segunda_habitacao"] };
  for (const [key, choices] of Object.entries(enums)) if (v[key]) {
    if (!choices.includes(String(v[key]))) throw new Error("Escolha inválida."); Object.assign(p, { [key]: v[key] });
  }
  if (v.needs != null) { if (typeof v.needs !== "string" || v.needs.length > 3000) throw new Error("Notas demasiado longas."); p.needs = v.needs; }
  if (v.nextContactAt) { if (typeof v.nextContactAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.nextContactAt) || !Number.isFinite(Date.parse(v.nextContactAt))) throw new Error("Data inválida."); p.nextContactAt = v.nextContactAt; }
  return p;
}
