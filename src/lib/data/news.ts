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
 *
 * Enquanto a fonte externa não está ligada, cada artigo abre numa página
 * interna (`/noticias/[id]`) com um resumo — assim nunca há links partidos.
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
    body: [
      "Depois de vários anos de subidas consecutivas, o mercado residencial no litoral português começa a dar sinais de estabilização em 2026. Nos concelhos de maior procura, a variação de preços aproxima-se da inflação, um contraste com os aumentos de dois dígitos registados no início da década.",
      "Os analistas apontam para uma combinação de fatores: taxas de juro mais previsíveis, aumento gradual da oferta de nova construção e uma procura mais seletiva por parte dos compradores, que ganharam poder negocial.",
      "Para quem compra, o momento traz uma janela de maior ponderação: há mais tempo para decidir e margem para negociar. Para quem vende, a preparação do imóvel e um preço realista voltam a ser determinantes para fechar negócio em tempo útil.",
    ],
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
    body: [
      "O pacote de medidas em torno da habitação introduziu alterações que tocam diretamente quem compra, vende ou arrenda. Entre as mais relevantes estão ajustes ao licenciamento, aos benefícios fiscais na aquisição de primeira habitação e às regras do arrendamento.",
      "Para o comprador de habitação própria permanente, mantêm-se apoios em sede de IMT em determinados escalões e há simplificações no processo de licenciamento que podem encurtar prazos.",
      "Como sempre que a lei muda, a recomendação é validar cada caso concreto com o consultor e, quando aplicável, com apoio jurídico — os detalhes fazem a diferença no valor final e nos prazos.",
    ],
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
    body: [
      "O Algarve continua a destacar-se na rentabilidade do arrendamento de curta duração, com yields brutas acima da média nacional nas zonas costeiras de maior procura turística.",
      "A sazonalidade continua a ser o principal fator a gerir: os meses de verão concentram grande parte da receita, pelo que a análise de investimento deve olhar para a ocupação anual, e não apenas para as tarifas de época alta.",
      "Investidores mais experientes combinam curta duração na época alta com arrendamento de média duração no inverno, suavizando a receita ao longo do ano e reduzindo o risco.",
    ],
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
    body: [
      "Comprar casa com recurso a crédito habitação é um processo com etapas bem definidas. Conhecê-las de antemão evita surpresas e atrasos.",
      "Comece pela pré-aprovação: com os documentos de rendimento e a análise à sua taxa de esforço, o banco indica o montante disponível. Com esse valor, a procura torna-se muito mais focada.",
      "Segue-se a avaliação do imóvel pelo banco, a aprovação final, o CPCV (contrato-promessa de compra e venda) e, por fim, a escritura. Em cada fase, o consultor e o intermediário de crédito ajudam a reunir a documentação e a cumprir os prazos.",
    ],
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
    body: [
      "A feira imobiliária SIMA, em Madrid, voltou a ser um barómetro das tendências que costumam chegar a Portugal com alguns meses de diferença. A edição de 2026 destacou a sustentabilidade e a eficiência energética como critérios cada vez mais decisivos na compra.",
      "As casas inteligentes — com domótica, gestão de energia e segurança integradas — deixaram de ser um extra de luxo para se tornarem um argumento de valorização.",
      "No financiamento, ganham espaço modelos mais flexíveis e produtos verdes, com condições preferenciais para imóveis de elevada eficiência energética.",
    ],
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
    body: [
      "Nem sempre é preciso uma grande obra para vender melhor e mais depressa. Muitas vezes, são os detalhes que fazem a diferença na primeira impressão.",
      "Luz, arrumação e neutralidade são os pilares: espaços bem iluminados, despersonalizados e sem excesso de mobília fotografam melhor e criam ligação imediata com o comprador.",
      "Reparações pequenas (torneiras, pinturas, dobradiças), uma boa reportagem fotográfica profissional e, quando faz sentido, o home staging virtual completam a lista de intervenções com melhor retorno.",
    ],
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

/** Um artigo pelo id (para a página interna `/noticias/[id]`). */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  return CURATED.find((n) => n.id === id) ?? null;
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
