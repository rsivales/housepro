/**
 * Fundo de pensão do consultor — alimentado pelos 2% retirados em cada negócio,
 * antes de qualquer divisão. O capital gera dividendos, tem um período mínimo
 * de permanência antes do levantamento e pode ter beneficiário (herança/doação).
 */

export interface PensionContribution {
  id: string;
  /** Data (ISO). */
  date: string;
  /** Referência do negócio que originou. */
  dealRef?: string;
  /** Valor contribuído (2% da comissão bruta) (€). */
  amount: number;
}

export interface PensionFund {
  /** Abertura do fundo (início da contagem de permanência). */
  openedAt: string;
  /** Anos mínimos de permanência antes de poder levantar. */
  minYears: number;
  /** Taxa de dividendos anual estimada (%). */
  annualRatePct: number;
  /** Dividendos acumulados até à data (€). */
  dividendsAccrued: number;
  /** Beneficiário designado (herança/doação). */
  beneficiary?: string;
  contributions: PensionContribution[];
}

export const demoPensionFund: PensionFund = {
  openedAt: "2023-02-01",
  minYears: 5,
  annualRatePct: 3.5,
  dividendsAccrued: 640,
  beneficiary: undefined,
  contributions: [
    { id: "pc-1", date: "2026-07-24", dealRef: "NEG-2041", amount: 166 },
    { id: "pc-2", date: "2026-06-30", dealRef: "NEG-2038", amount: 90 },
    { id: "pc-3", date: "2026-05-18", dealRef: "NEG-2032", amount: 220 },
    { id: "pc-4", date: "2026-04-02", dealRef: "NEG-2027", amount: 130 },
    { id: "pc-5", date: "2026-02-14", dealRef: "NEG-2019", amount: 300 },
  ],
};

export function totalContributed(f: PensionFund): number {
  return f.contributions.reduce((s, c) => s + c.amount, 0);
}

/** Saldo = contribuições + dividendos acumulados. */
export function pensionBalance(f: PensionFund): number {
  return totalContributed(f) + f.dividendsAccrued;
}

export interface PermanenceStatus {
  unlocked: boolean;
  /** Data em que desbloqueia. */
  unlockDate: Date;
  /** Anos já cumpridos. */
  yearsElapsed: number;
  /** % do período mínimo cumprido. */
  progressPct: number;
}

export function permanenceStatus(f: PensionFund, now = new Date()): PermanenceStatus {
  const opened = new Date(f.openedAt);
  const unlockDate = new Date(opened);
  unlockDate.setFullYear(opened.getFullYear() + f.minYears);
  const yearsElapsed = (now.getTime() - opened.getTime()) / (365.25 * 24 * 3600 * 1000);
  return {
    unlocked: now >= unlockDate,
    unlockDate,
    yearsElapsed,
    progressPct: Math.min(100, (yearsElapsed / f.minYears) * 100),
  };
}
