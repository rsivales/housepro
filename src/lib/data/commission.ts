import type { Property } from "./types";
import { formatEuro } from "@/lib/format";

/**
 * Comissão do imóvel — em % ou valor fixo, com mínimos por escalão de preço.
 *
 * Mínimos (comissão em vigor) para imóveis de valor baixo, onde a % renderia
 * pouco:
 *   preço < 50.000 €  → mínimo 4.000 €
 *   preço < 100.000 € → mínimo 5.000 €
 * Acima disso vale a base definida (percentagem ou fixo).
 */

export interface CommissionInput {
  commissionType?: "percent" | "fixed";
  commissionPct?: number;
  commissionFixed?: number;
}

export interface EffectiveCommission {
  /** Valor em € da comissão em vigor. */
  amount: number;
  /** Como foi determinada: base percentual, base fixa, ou mínimo do escalão. */
  basis: "percent" | "fixed" | "floor" | "none";
  /** % configurada (quando aplicável). */
  pct?: number;
}

/** Mínimo (€) da comissão para um dado preço. */
export function commissionFloor(price: number): number {
  if (price <= 0) return 0;
  if (price < 50000) return 4000;
  if (price < 100000) return 5000;
  return 0;
}

/** Comissão em vigor: aplica a base (%/fixo) e o mínimo do escalão. */
export function effectiveCommission(
  price: number,
  c: CommissionInput
): EffectiveCommission {
  const isFixed = c.commissionType === "fixed" || (c.commissionFixed != null && c.commissionType == null);
  const base = isFixed
    ? c.commissionFixed ?? 0
    : c.commissionPct != null
      ? (price * c.commissionPct) / 100
      : 0;
  const floor = commissionFloor(price);

  if (base <= 0 && floor <= 0) return { amount: 0, basis: "none" };
  if (floor > base) return { amount: floor, basis: "floor", pct: c.commissionPct };
  return {
    amount: base,
    basis: isFixed ? "fixed" : "percent",
    pct: isFixed ? undefined : c.commissionPct,
  };
}

/** Rótulo curto e transparente da comissão em vigor. */
export function commissionLabel(price: number, c: CommissionInput): string {
  const e = effectiveCommission(price, c);
  if (e.basis === "none") return "Comissão a definir";
  if (e.basis === "percent") return `${e.pct}% · ${formatEuro(e.amount)}`;
  if (e.basis === "fixed") return `${formatEuro(e.amount)} (fixo)`;
  // floor
  return `${formatEuro(e.amount)} (mínimo)`;
}

/** Conveniência a partir de um Property. */
export function propertyCommission(p: Property): EffectiveCommission {
  return effectiveCommission(p.price, p);
}
