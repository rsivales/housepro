/**
 * Banners dinâmicos da homepage pública. Geridos (no futuro) pelo admin via
 * site_settings; por defeito usa este conjunto. A seleção é ESTÁVEL por sessão
 * (não muda enquanto o visitante lê/pesquisa). Sem carrossel agressivo.
 *
 * As fotografias reais entram pelo admin (campo `image`); na ausência, usa-se um
 * fundo Deep Navy elegante (fallback HousePro) — nunca uma ilustração infantil.
 */

export type BannerIntent = "comprar" | "vender" | "investir" | "recrutamento" | "institucional";

export interface Banner {
  id: string;
  title: string;
  text: string;
  line?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Fotografia/vídeo carregados no admin (armazenamento próprio). */
  image?: string;
  video?: string;
  alt?: string;
  /** object-position da fotografia (mantém o assunto visível no recorte mobile). */
  focal?: string;
  /** Segmentação. */
  location?: "Algarve" | "Lisboa" | "Porto";
  audience?: string;
  intent?: BannerIntent;
  priority?: number;
  active?: boolean;
  startAt?: string;
  endAt?: string;
}

/** Banner principal APROVADO + variantes por zona/intenção. */
export const DEFAULT_BANNERS: Banner[] = [
  {
    id: "principal",
    title: "A casa certa muda tudo.",
    text: "Comprar, vender ou investir — com paixão pelo que fazemos.",
    line: "Algarve · Lisboa · Porto",
    primary: { label: "Encontrar casa", href: "/imoveis" },
    secondary: { label: "Vender imóvel", href: "/vender" },
    intent: "comprar",
    priority: 100,
    active: true,
    image: "/home/banner-familia.webp",
    focal: "72% 50%",
    alt: "Família a visitar uma casa com vista mar, acompanhada por uma consultora HousePro.",
  },
  {
    id: "vender",
    title: "O valor da sua casa, com quem conhece o mercado.",
    text: "Avaliação honesta e uma estratégia de venda pensada ao pormenor.",
    line: "Avaliação gratuita · sem compromisso",
    primary: { label: "Vender imóvel", href: "/vender" },
    secondary: { label: "Avaliar a minha casa", href: "/vender" },
    intent: "vender",
    priority: 60,
    active: true,
  },
  {
    id: "investir",
    title: "Investir bem começa por decidir com dados.",
    text: "Oportunidades selecionadas e rentabilidade explicada, sem jargão.",
    line: "Algarve · Lisboa · Porto",
    primary: { label: "Ver oportunidades", href: "/investir" },
    secondary: { label: "Falar com um consultor", href: "/#contacto" },
    intent: "investir",
    priority: 50,
    active: true,
  },
];

const inWindow = (b: Banner, now: Date): boolean => {
  if (b.startAt && new Date(b.startAt) > now) return false;
  if (b.endAt && new Date(b.endAt) < now) return false;
  return true;
};

/** Banners elegíveis agora (ativos + dentro da janela), por prioridade. */
export function activeBanners(banners: Banner[], now: Date = new Date()): Banner[] {
  return banners
    .filter((b) => b.active !== false && inWindow(b, now))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/** Escolha determinística a partir de uma semente (id de sessão). */
export function pickStable(banners: Banner[], seed: number): Banner {
  if (banners.length === 0) return DEFAULT_BANNERS[0];
  const i = Math.abs(seed) % banners.length;
  return banners[i];
}
