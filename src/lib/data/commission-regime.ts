import { COMMISSION } from "@/lib/commission/config";

export interface CommissionRegime {
  agencyCap: number;
  ladder: { upTo: number | null; withCompany: number; withoutCompany: number }[];
  overrideTiers: number[];
  otherIncomeShares: Record<OtherIncomeCategory, number>;
  royaltiesPct: number;
  pensionPct: number;
  brokerPensionPct: number;
}

export const OTHER_INCOME_CATEGORIES = {
  credito: "Crédito habitação",
  certificado: "Certificado energético",
  parceria: "Outra parceria",
  outros: "Outro rendimento",
} as const;
export type OtherIncomeCategory = keyof typeof OTHER_INCOME_CATEGORIES;

export const DEFAULT_REGIME: CommissionRegime = {
  agencyCap: COMMISSION.agencyCap,
  ladder: COMMISSION.ladder.map(b => ({ upTo: Number.isFinite(b.upTo) ? b.upTo : null, withCompany: b.withCompany, withoutCompany: b.withoutCompany })),
  overrideTiers: [...COMMISSION.overrideTiers],
  otherIncomeShares: { credito: 50, certificado: 50, parceria: 50, outros: 50 },
  royaltiesPct: COMMISSION.royaltiesPct,
  pensionPct: COMMISSION.pensionPct,
  brokerPensionPct: COMMISSION.brokerPensionPct,
};

export function validateRegime(input: unknown): input is CommissionRegime {
  if (!input || typeof input !== "object") return false;
  const p = input as Partial<CommissionRegime>;
  const pct = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100 && Math.abs(Math.round(n * 100) - n * 100) < 0.000001;
  if (p.royaltiesPct !== 3 || p.pensionPct !== 2 || p.brokerPensionPct !== 2) return false;
  if (typeof p.agencyCap !== "number" || !Number.isInteger(p.agencyCap) || p.agencyCap < 1000 || p.agencyCap > 10000000) return false;
  if (!Array.isArray(p.ladder) || p.ladder.length !== 3 || !Array.isArray(p.overrideTiers) || p.overrideTiers.length !== 4) return false;
  const [first, second, last] = p.ladder;
  if (!Number.isInteger(first?.upTo) || !Number.isInteger(second?.upTo) || (first.upTo as number) < 1000 || (second.upTo as number) <= (first.upTo as number) || (second.upTo as number) > 100000000 || last?.upTo !== null) return false;
  if (p.ladder.some(b => !pct(b.withCompany) || !pct(b.withoutCompany) || b.withCompany < b.withoutCompany)) return false;
  if (p.overrideTiers.some(n => !pct(n)) || p.overrideTiers.reduce((a, b) => a + b, 0) > 20) return false;
  const shares = p.otherIncomeShares;
  if (!shares || Object.keys(shares).sort().join() !== Object.keys(OTHER_INCOME_CATEGORIES).sort().join()) return false;
  return Object.values(shares).every(pct);
}

export function regimeForCalculator(p: CommissionRegime) {
  return {
    ladder: p.ladder.map(b => ({ ...b, upTo: b.upTo ?? Infinity })), agencyCap: p.agencyCap,
    royaltiesAgentPct: p.royaltiesPct, royaltiesAgencyPct: p.royaltiesPct,
    pensionPct: p.pensionPct, brokerPensionPct: p.brokerPensionPct,
    networkPoolPct: p.overrideTiers.reduce((sum, n) => sum + n, 0),
  };
}
