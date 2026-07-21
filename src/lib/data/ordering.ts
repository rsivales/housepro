import type { Property } from "./types";
import { rankedProperties } from "./ranking";

export type OrderingRule =
  | "recentes"
  | "destaque"
  | "preco_desc"
  | "preco_asc"
  | "interesse";

export const ORDERING_LABELS: Record<OrderingRule, string> = {
  recentes: "Mais recentes",
  destaque: "Em destaque (algoritmo)",
  preco_desc: "Preço: maior primeiro",
  preco_asc: "Preço: menor primeiro",
  interesse: "Mais procurados",
};

export const ORDERING_RULES = Object.keys(ORDERING_LABELS) as OrderingRule[];

/** Applies a display rule to a list of properties (non-mutating). */
export function applyOrdering(
  list: Property[],
  rule: OrderingRule
): Property[] {
  const arr = [...list];
  switch (rule) {
    case "recentes":
      return arr.sort((a, b) =>
        (b.listedAt ?? "").localeCompare(a.listedAt ?? "")
      );
    case "preco_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "preco_asc":
      return arr.sort((a, b) => a.price - b.price);
    case "interesse":
      return arr.sort((a, b) => (b.interest ?? 0) - (a.interest ?? 0));
    case "destaque":
    default:
      return rankedProperties(arr);
  }
}
