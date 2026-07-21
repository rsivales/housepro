import { properties } from "./mock";
import type { Property } from "./types";

/**
 * Featured ranking — decide que imóveis sobem para o topo (preview da
 * homepage e ordem da grelha). Score ponderado, transparente e afinável:
 *
 *   score = estado + interesse·0.35 + gama_de_preço·12 + recência·15
 *
 * - estado:  destaque +40 · reduzido +28 (baixa de preço atrai) ·
 *            novo +22 · sem selo 0 · "vendido" é excluído
 * - interesse (0–100): proxy de procura (visitas + leads + favoritos).
 *   No M2+ vem de analytics reais; aqui é um campo do imóvel.
 * - gama_de_preço (0–1): imóveis "troféu" ganham algum destaque no
 *   topo, sem dominar (peso baixo).
 * - recência (0–1): angariações recentes recebem boost, decaindo a 0
 *   ao fim de ~45 dias.
 *
 * O melhor algoritmo aqui é uma soma ponderada e explicável (fácil de
 * afinar por agência) em vez de uma "caixa preta": o negócio percebe
 * porque é que um imóvel está no topo.
 */
export function featuredScore(
  p: Property,
  ctx: { maxPrice: number; now?: number }
): number {
  if (p.status === "vendido") return Number.NEGATIVE_INFINITY;

  const estado =
    p.status === "destaque"
      ? 40
      : p.status === "reduzido"
        ? 28
        : p.status === "novo"
          ? 22
          : 0;

  const interesse = (p.interest ?? 0) * 0.35;
  const gamaPreco = ctx.maxPrice > 0 ? (p.price / ctx.maxPrice) * 12 : 0;

  const now = ctx.now ?? Date.now();
  const dias = p.listedAt
    ? (now - Date.parse(p.listedAt)) / 86_400_000
    : 60;
  const recencia = Math.max(0, 1 - dias / 45) * 15;

  return estado + interesse + gamaPreco + recencia;
}

/** Todas as propriedades ordenadas por score (excluindo vendidos). */
export function rankedProperties(list: Property[] = properties): Property[] {
  const maxPrice = Math.max(...list.map((p) => p.price));
  const now = Date.now();
  return list
    .filter((p) => p.status !== "vendido")
    .map((p) => ({ p, s: featuredScore(p, { maxPrice, now }) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

/** Top N imóveis para o preview da homepage. */
export function topFeatured(n = 3, list: Property[] = properties): Property[] {
  return rankedProperties(list).slice(0, n);
}
