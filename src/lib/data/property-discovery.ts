import type { Property } from "@/lib/data/types";

export type PropertyScore = { quality: number; priceMarket: number; missing: string[] };
export type RotationConfig = {
  startDate?: string;
  municipalityOrder?: string[];
  agencyOrder?: string[];
  pinned?: { propertyId: string; startsAt: string; endsAt: string }[];
};

const dayKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value ?? "01";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const ordinal = (value: string) => Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000);

export function propertyQuality(property: Property): { score: number; missing: string[] } {
  const checks: Array<[boolean, number, string]> = [
    [Boolean(property.image), 14, "Fotografia principal"],
    [(property.gallery?.length ?? 0) >= 8, 12, "Pelo menos 8 fotografias"],
    [Boolean(property.title?.trim()), 7, "Título"],
    [(property.description?.trim().length ?? 0) >= 300, 12, "Descrição completa"],
    [property.price > 0, 8, "Preço"],
    [Boolean(property.parish && property.municipality), 8, "Localização"],
    [property.area > 0, 7, "Área"],
    [Boolean(property.type && (property.typology || property.type === "Terreno")), 7, "Tipo e tipologia"],
    [property.beds >= 0 && property.baths >= 0, 5, "Quartos e casas de banho"],
    [Boolean(property.energy), 5, "Certificado energético"],
    [(property.documents?.length ?? 0) >= 5, 8, "Documentação essencial"],
    [Boolean(property.shortDescription?.trim()), 4, "Resumo"],
    [property.lat != null && property.lng != null, 3, "Coordenadas"],
  ];
  return { score: checks.reduce((sum, [ok, weight]) => sum + (ok ? weight : 0), 0), missing: checks.filter(([ok]) => !ok).map(([, , label]) => label) };
}
export function propertyScores(properties: Property[]): Map<string, PropertyScore> {
  const groups = new Map<string, number[]>();
  for (const property of properties) {
    if (!property.price || !property.area) continue;
    const key = `${property.municipality.toLowerCase()}|${property.type}|${property.typology ?? "-"}`;
    groups.set(key, [...(groups.get(key) ?? []), property.price / property.area]);
  }
  const output = new Map<string, PropertyScore>();
  for (const property of properties) {
    const quality = propertyQuality(property);
    const key = `${property.municipality.toLowerCase()}|${property.type}|${property.typology ?? "-"}`;
    const sample = (groups.get(key) ?? []).filter(Number.isFinite).sort((a, b) => a - b);
    let priceMarket = 50;
    if (sample.length >= 3 && property.price > 0 && property.area > 0) {
      const median = sample[Math.floor(sample.length / 2)];
      const ratio = property.price / property.area / median;
      priceMarket = Math.round(Math.max(0, 100 - Math.abs(1 - ratio) * 125));
      if (ratio < 0.55) priceMarket = Math.min(priceMarket, 25);
    }
    output.set(property.id, { quality: quality.score, priceMarket, missing: quality.missing });
  }
  return output;
}

function activePin(properties: Property[], config: RotationConfig, now: Date) {
  const stamp = now.getTime();
  return (config.pinned ?? []).map((pin) => ({ ...pin, property: properties.find((p) => p.id === pin.propertyId) })).find((pin) => pin.property && Date.parse(pin.startsAt) <= stamp && Date.parse(pin.endsAt) >= stamp)?.property;
}

export function selectMunicipalityWinner(properties: Property[], municipality: string, config: RotationConfig = {}, now = new Date()): Property | undefined {
  const eligible = properties.filter((p) => p.municipality.localeCompare(municipality, "pt", { sensitivity: "base" }) === 0);
  const pinned = activePin(eligible, config, now);
  if (pinned) return pinned;
  const agencyGroups = new Map<string, Property[]>();
  eligible.forEach((property) => { const id = property.agent?.agencyId || property.agentId; agencyGroups.set(id, [...(agencyGroups.get(id) ?? []), property]); });
  const configured = config.agencyOrder ?? [];
  const agencies = [...agencyGroups.keys()].sort((a, b) => {
    const ai = configured.indexOf(a), bi = configured.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
    return a.localeCompare(b);
  });
  if (!agencies.length) return undefined;
  const start = ordinal(config.startDate || "2026-01-01");
  const index = ((ordinal(dayKey(now)) - start) % agencies.length + agencies.length) % agencies.length;
  const scores = propertyScores(eligible);
  for (let offset = 0; offset < agencies.length; offset += 1) {
    const candidates = agencyGroups.get(agencies[(index + offset) % agencies.length]) ?? [];
    const winner = candidates.sort((a, b) => {
      const as = scores.get(a.id)!, bs = scores.get(b.id)!;
      return bs.quality - as.quality || bs.priceMarket - as.priceMarket || Date.parse(a.listedAt || "1970-01-01") - Date.parse(b.listedAt || "1970-01-01");
    })[0];
    if (winner) return winner;
  }
}

export function selectGeneralHero(properties: Property[], config: RotationConfig = {}, now = new Date()): Property | undefined {
  const municipalities = [...new Set(properties.map((p) => p.municipality).filter(Boolean))];
  const preferred = config.municipalityOrder?.filter((name) => municipalities.includes(name)) ?? [];
  const ordered = [...preferred, ...municipalities.filter((name) => !preferred.includes(name)).sort((a, b) => a.localeCompare(b, "pt"))];
  if (!ordered.length) return undefined;
  const start = ordinal(config.startDate || "2026-01-01");
  for (let offset = 0; offset < ordered.length; offset += 1) {
    const index = (((ordinal(dayKey(now)) - start) + offset) % ordered.length + ordered.length) % ordered.length;
    const winner = selectMunicipalityWinner(properties, ordered[index], config, now);
    if (winner) return winner;
  }
}
