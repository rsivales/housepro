import { EDITORIAL_2026 } from "./news-2026";

export type NewsCategory =
  | "Mercado"
  | "Legislação"
  | "Investimento"
  | "Dicas"
  | "Eventos"
  | "Internacional";

export interface NewsItem {
  id: string;
  category: NewsCategory;
  title: string;
  excerpt: string;
  /** Origin feed name (e.g. "Idealista News", "Público Economia"). */
  source: string;
  /** ISO date. */
  date: string;
  /** Link externo para a fonte original (quando o feed real o fornece).
   *  Vazio/"#" → o artigo abre na página interna `/noticias/[id]`. */
  url: string;
  /** Corpo do artigo (parágrafos) para a página interna. */
  body?: string[];
  /** Imagem de destaque definida no admin (prioridade máxima). */
  featuredImage?: string;
  /** Imagem associada ao artigo (ex.: capa da fonte importada). */
  image?: string;
  /** Tailwind gradient for the placeholder thumbnail. */
  tint: string;
  /** Fontes primárias verificáveis da análise editorial. */
  sources?: { label: string; url: string }[];
}

/** Fallbacks locais por categoria (nunca cinzento no estado final). */
const CATEGORY_FALLBACK: Record<NewsCategory, string> = {
  Mercado: "/news/mercado.webp",
  Legislação: "/news/legislacao.webp",
  Investimento: "/news/investimento.webp",
  Dicas: "/news/dicas.webp",
  Eventos: "/news/eventos.webp",
  Internacional: "/news/internacional.webp",
};

/** Fallback geral HousePro (último recurso). */
export const NEWS_FALLBACK = "/news/geral.webp";

/**
 * Imagem do artigo por ordem de prioridade:
 * 1) featuredImage (admin) → 2) imagem associada/importada →
 * 3) fallback da categoria → 4) fallback geral HousePro.
 * Nunca devolve vazio, por isso nunca há <img> sem src válido.
 */
export function newsImage(item: NewsItem): string {
  return item.featuredImage || item.image || CATEGORY_FALLBACK[item.category] || NEWS_FALLBACK;
}

/** Artigos aprovados e textos editoriais verificados coexistem no Guia. */
export async function getNews(limit?: number): Promise<NewsItem[]> {
  const { listApprovedNews } = await import("@/lib/db/news");
  const real = await listApprovedNews();
  const sorted = [...real, ...EDITORIAL_2026.filter((n) => !real.some((r) => r.id === n.id))]
    .sort((a, b) => b.date.localeCompare(a.date));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/** Um artigo pelo id (para a página interna `/noticias/[id]`). */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  const { getApprovedNewsById } = await import("@/lib/db/news");
  const real = await getApprovedNewsById(id);
  if (real) return real;
  return EDITORIAL_2026.find((n) => n.id === id) ?? null;
}

/** É um link externo (fonte real) ou abre a página interna do artigo? */
export function isExternalNews(item: NewsItem): boolean {
  return /^https?:\/\//i.test(item.url);
}

/** Destino do artigo: fonte externa quando existe, senão a página interna. */
export function newsHref(item: NewsItem): string {
  return isExternalNews(item) ? item.url : `/noticias/${item.id}`;
}

export const newsCategories: NewsCategory[] = [
  "Mercado",
  "Legislação",
  "Investimento",
  "Dicas",
  "Eventos",
  "Internacional",
];
