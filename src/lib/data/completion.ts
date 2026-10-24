import type { Property, PropertyStatus } from "./types";

export function isCompleted(status?: PropertyStatus | null) {
  return status === "vendido" || status === "arrendado";
}

/** Frozen calendar days from publication to completion; never a live counter. */
export function completionLabel(p: Pick<Property, "status" | "listedAt" | "soldAt" | "cpcvAt">): string | null {
  const endDate = p.status === "vendido" ? p.cpcvAt : p.soldAt;
  if (!isCompleted(p.status) || !p.listedAt || !endDate) return null;
  const day = (value: string) => {
    const date = value.slice(0, 10);
    const stamp = Date.parse(`${date}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date ? stamp : NaN;
  };
  const days = (day(endDate) - day(p.listedAt)) / 86_400_000;
  const limit = p.status === "vendido" ? 45 : 15;
  if (!Number.isInteger(days) || days < 0 || days >= limit) return null;
  return `${p.status === "vendido" ? "Vendido" : "Arrendado"} em ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function publicPriceHidden(p: Pick<Property, "status" | "priceVisible">) {
  return isCompleted(p.status) || p.status === "cpcv" || p.priceVisible === false;
}
