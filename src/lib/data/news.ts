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
  url: string;
  /** Tailwind gradient for the placeholder thumbnail. */
  tint: string;
}

/**
 * Feed próprio de notícias imobiliárias.
 *
 * Objetivo: a agência NÃO precisa de escrever notícias — o site agrega
 * automaticamente um feed. Em produção, `getNews()` corre no servidor
 * (Route Handler / Edge Function com revalidação horária) e faz fetch +
 * parse de fontes RSS/Atom (ex.: Idealista News, Público Economia,
 * Confidencial Imobiliário, Reuters Real Estate) normalizando para
 * `NewsItem`. Neste ambiente a rede externa está bloqueada, por isso
 * devolvemos um conjunto curado e representativo com a mesma forma —
 * basta ligar as fontes reais para ficar 100% automático.
 */
const CURATED: NewsItem[] = [
  {
    id: "n1",
    category: "Mercado",
    title: "Preços da habitação estabilizam no litoral em 2026",
    excerpt:
      "Depois de anos de subidas, o mercado dá sinais de equilíbrio nas zonas de maior procura.",
    source: "Confidencial Imobiliário",
    date: "2026-07-15",
    url: "#",
    tint: "from-primary/15 to-primary/5",
  },
  {
    id: "n2",
    category: "Legislação",
    title: "Novas regras do Mais Habitação: o que muda para quem compra",
    excerpt:
      "Alterações ao arrendamento, licenciamento e benefícios fiscais explicadas em linguagem simples.",
    source: "Diário da República",
    date: "2026-07-11",
    url: "#",
    tint: "from-chart-3/15 to-chart-3/5",
  },
  {
    id: "n3",
    category: "Investimento",
    title: "Algarve lidera rentabilidade de arrendamento de curta duração",
    excerpt:
      "Yields acima da média nacional atraem investidores nacionais e estrangeiros.",
    source: "Idealista News",
    date: "2026-07-09",
    url: "#",
    tint: "from-gold/20 to-gold/5",
  },
  {
    id: "n4",
    category: "Dicas",
    title: "Comprar casa com crédito: o passo a passo simplificado",
    excerpt:
      "Da pré-aprovação à escritura — o que preparar em cada fase para não ter surpresas.",
    source: "HousePro",
    date: "2026-07-07",
    url: "#",
    tint: "from-primary/12 to-gold/10",
  },
  {
    id: "n5",
    category: "Internacional",
    title: "SIMA Madrid 2026: tendências que chegam a Portugal",
    excerpt:
      "Sustentabilidade, casas inteligentes e novos modelos de financiamento em destaque.",
    source: "Reuters Real Estate",
    date: "2026-07-03",
    url: "#",
    tint: "from-chart-4/15 to-chart-4/5",
  },
  {
    id: "n6",
    category: "Dicas",
    title: "Vender mais depressa: 7 detalhes que valorizam o seu imóvel",
    excerpt:
      "Pequenas intervenções com grande impacto no preço final e no tempo de venda.",
    source: "HousePro",
    date: "2026-06-28",
    url: "#",
    tint: "from-gold/15 to-primary/5",
  },
];

/**
 * Devolve as notícias do feed. Assíncrono de propósito — para em produção
 * passar a `await fetchAndParseFeeds()` sem mudar quem a consome.
 */
export async function getNews(limit?: number): Promise<NewsItem[]> {
  const sorted = [...CURATED].sort((a, b) => b.date.localeCompare(a.date));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export const newsCategories: NewsCategory[] = [
  "Mercado",
  "Legislação",
  "Investimento",
  "Dicas",
  "Eventos",
  "Internacional",
];
