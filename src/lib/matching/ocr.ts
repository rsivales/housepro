import type { BuyerProfile } from "./profile";
export type OcrSuggestion = { name?: string; phone?: string; email?: string; zone?: string; buyerProfile?: BuyerProfile };
/** Extract only labelled fields. Never infer consent, ownership, NIF or urgency from loose words. */
export function parseBuyerOcr(text: string): OcrSuggestion {
  const find = (labels: string) => text.match(new RegExp(`(?:^|\\n)\\s*(?:${labels})\\s*[:=]\\s*([^\\n]+)`, "i"))?.[1]?.trim();
  const result: OcrSuggestion = {}, p: BuyerProfile = {};
  const name = find("nome(?: completo)?|cliente"); if (name) result.name = name.slice(0,150);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]; if (email) result.email = email;
  const rawPhone = find("telefone|telem[oó]vel|contacto");
  const phone = rawPhone?.match(/(?:\+351\s*)?[29]\d{2}(?:[ .-]?\d){6}/)?.[0]; if (phone) result.phone = phone.replace(/[^\d+]/g, "");
  const zone = find("zona(?:s)?|localiza[cç][aã]o|concelho"); if (zone) { result.zone = zone; p.zones = zone.split(/[,;]/).map(s => s.trim()).filter(Boolean); }
  const budget = find("or[cç]amento(?: m[aá]ximo)?|budget(?: m[aá]ximo)?|m[aá]ximo");
  if (budget) {
    // Ranges are ambiguous: require manual confirmation of a single maximum.
    const clean = budget.replace(/€|eur(?:os)?/gi, "").trim();
    if (/^\d[\d .]*(?:,\d{1,2})?\s*[kK]?$/.test(clean)) {
      const n = Number(clean.replace(/[ .]/g, "").replace(",", ".").replace(/[kK]/, "")) * (/k/i.test(clean) ? 1000 : 1);
      if (n > 0 && n <= 1e10) p.budgetMax = n;
    }
  }
  const typologies = find("tipologia(?:s)?"); if (typologies) p.typologies = [...new Set(typologies.toUpperCase().match(/\bT\d{1,2}(?:\+\d)?\b/g) ?? [])];
  const months = find("prazo(?: de compra)?|compra em"); if (months && /^\d+\s*mes(?:es)?$/i.test(months)) { const n = parseInt(months); if (n > 0 && n <= 120) p.timeframeMonths = n; }
  const needs = find("observa[cç][oõ]es|necessidades|notas"); if (needs) p.needs = needs.slice(0,3000);
  if (Object.keys(p).length) result.buyerProfile = p;
  return result;
}
