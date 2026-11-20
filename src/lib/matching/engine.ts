import { CONCELHOS_POR_DISTRITO, freguesiasDoConcelho } from "@/lib/data/portugal-geo";
import type { BuyerProfile } from "./profile";
export const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export type MatchProperty = { id: string; reference: string; title: string; price: number; typology: string | null; parish: string; municipality: string; status: string | null; operation: string; approval: string; listing_state: string; off_market: boolean; agent_id: string; accepts_exchange?: boolean; proposal?: boolean };
export type MatchResult = { score: number; exact: boolean; reasons: string[]; warnings: string[]; status: string; buyerEligible: boolean; propertyEligible: boolean };
const parishMunicipalities = new Map<string, Set<string>>();
for (const [district, citiesInDistrict] of Object.entries(CONCELHOS_POR_DISTRITO)) for (const city of citiesInDistrict) for (const parish of freguesiasDoConcelho(district,city)) {
  const n = normal(parish), cities = parishMunicipalities.get(n) ?? new Set<string>();
  cities.add(normal(city)); parishMunicipalities.set(n, cities);
}
export function missingQualification(p: BuyerProfile = {}, direction: "buyer" | "property" = "buyer") {
  return [!p.budgetMax && "orçamento máximo", !p.zones?.filter(Boolean).length && "zona", direction === "buyer" && !p.typologies?.filter(Boolean).length && "tipologia", direction === "property" && !["media","alta"].includes(p.urgency ?? "") && "urgência média ou alta"].filter(Boolean) as string[];
}
/** Price is a ceiling, not a lower bound. Geography is never guessed from unrelated strings. */
export function matchBuyer(p: BuyerProfile, property: MatchProperty): MatchResult | null {
  const buyerEligible = missingQualification(p,"buyer").length === 0, propertyEligible = missingQualification(p,"property").length === 0;
  if (p.active === false || (!buyerEligible && !propertyEligible) || property.operation !== "venda" || property.approval !== "aprovado" || property.listing_state !== "activo" || property.off_market || !property.agent_id || !Number.isFinite(property.price) || property.price <= 0 || ["vendido","arrendado","cpcv"].includes(property.status ?? "")) return null;
  const flex = Math.min(40, Math.max(30, p.flexibilityPct ?? 35)) / 100;
  const excess = Math.max(0, property.price / p.budgetMax! - 1);
  if (excess > flex + 1e-9) return null;
  const reasons: string[] = [], warnings: string[] = [];
  const city = normal(property.municipality), parish = normal(property.parish), zones = p.zones!.map(normal);
  const exactZone = zones.some(z => z === city || z === parish || z === `${parish} ${city}`);
  // A parish name shared by multiple municipalities is ambiguous: no automatic expansion.
  const expandedZone = p.broadenZone !== false && zones.some(z => { const cities = parishMunicipalities.get(z); return cities?.size === 1 && cities.has(city); });
  if (!exactZone && !expandedZone) return null;
  reasons.push(exactZone ? "Zona procurada" : "Outra freguesia do mesmo concelho");
  if (!exactZone) warnings.push("Zona alargada: confirmar com o comprador");
  const beds = (property.typology ?? "").match(/^T(\d+)(?:\+(\d+))?$/i);
  if (!beds) return null;
  const targetBeds = (p.typologies ?? []).map(t => Number(t.match(/^T(\d+)/i)?.[1])).filter(Number.isFinite);
  const distance = targetBeds.length ? Math.min(...targetBeds.map(t => Math.abs(Number(beds[1]) - t) / Math.max(3, t))) : 0;
  if (distance > flex + 1e-9) return null;
  if (!targetBeds.length) warnings.push("Tipologia do comprador por confirmar");
  if (distance) warnings.push(`Tipologia alternativa: ${property.typology}`); else if (targetBeds.length) reasons.push("Tipologia procurada");
  if (excess) warnings.push(`${Math.round(excess * 100)}% acima do orçamento máximo — requer confirmação`); else reasons.push("Dentro do orçamento");
  const status = property.status === "reservado" ? "Reservado" : property.proposal ? "Com proposta" : "Disponível";
  if (status !== "Disponível") warnings.push(`${status}: confirmar disponibilidade com o angariador`);
  if (property.accepts_exchange) reasons.push("Proprietário recetivo a permuta");
  return { score: Math.round(100 - excess / flex * 20 - distance / flex * 15 - (!exactZone ? 15 : 0) - (!targetBeds.length ? 10 : 0)), exact: !excess && !distance && exactZone && targetBeds.length > 0, reasons, warnings, status, buyerEligible, propertyEligible };
}
