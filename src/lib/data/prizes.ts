/**
 * Prémios / conquistas do consultor — duas trilhas (faturação e angariação),
 * agarradas ao acumulador do ciclo. Cada patamar tem nome, frase inspiradora,
 * cor e (opcional) imagem carregada pela marca. Alimenta a área de Objetivos &
 * Prémios e o "hall da fama" (cronologia + frase para chegar mais alto).
 */

export type PrizeTrack = "faturacao" | "angariacao";

export interface Prize {
  /** Limiar (faturação em € ou nº de angariações). */
  threshold: number;
  name: string;
  /** Frase curta de motivação. */
  tagline: string;
  /** Ícone lucide (nome) — fallback quando não há imagem. */
  icon: string;
  /** Cor do selo (token/hex). */
  color: string;
  /** Imagem carregada pela marca (data URL / URL). Substitui o ícone. */
  image?: string;
}

export const FATURACAO_PRIZES: Prize[] = [
  { threshold: 10000, name: "Centelha", tagline: "A primeira faísca. O arranque está dado.", icon: "Sparkles", color: "#a3862c" },
  { threshold: 30000, name: "Impulso", tagline: "Ganhaste tração — agora é acelerar.", icon: "TrendingUp", color: "#c79a2e" },
  { threshold: 60000, name: "Autoridade", tagline: "Top producer. O mercado já te reconhece.", icon: "BadgeCheck", color: "#3f6f52" },
  { threshold: 85000, name: "Estratega", tagline: "Já não é sorte — é método.", icon: "Compass", color: "#3f4a44" },
  { threshold: 100000, name: "Ouro", tagline: "Marco de ouro. Estás noutro patamar.", icon: "Medal", color: "#b8860b" },
  { threshold: 125000, name: "Referência", tagline: "És nome quando se fala de imobiliário.", icon: "Lightbulb", color: "#2f6f8f" },
  { threshold: 150000, name: "Elite", tagline: "Poucos chegam aqui. Tu chegaste.", icon: "Gem", color: "#6b46c1" },
  { threshold: 175000, name: "Mestre", tagline: "Domínio total do ofício.", icon: "Award", color: "#8a2be2" },
  { threshold: 200000, name: "Lenda", tagline: "O teu nome fica na história da marca.", icon: "Trophy", color: "#a3862c" },
  { threshold: 250000, name: "Ícone", tagline: "Inspiração para toda a rede.", icon: "Star", color: "#b8860b" },
];

export const ANGARIACAO_PRIZES: Prize[] = [
  { threshold: 1, name: "Primeira Montra", tagline: "A primeira angariação. Começou a história.", icon: "Home", color: "#a3862c" },
  { threshold: 5, name: "Caçador", tagline: "Cinco angariações — instinto afinado.", icon: "Crosshair", color: "#c79a2e" },
  { threshold: 10, name: "Angariador", tagline: "Dez montras. És máquina de captar.", icon: "KeyRound", color: "#3f6f52" },
  { threshold: 25, name: "Especialista de Montra", tagline: "Vinte e cinco. A tua carteira fala por ti.", icon: "Building2", color: "#3f4a44" },
  { threshold: 50, name: "Mestre de Montra", tagline: "Cinquenta angariações. Referência local.", icon: "Landmark", color: "#b8860b" },
  { threshold: 100, name: "Lenda da Angariação", tagline: "Cem montras. Poucos no país o conseguem.", icon: "Trophy", color: "#6b46c1" },
];

export function prizesFor(track: PrizeTrack): Prize[] {
  return track === "faturacao" ? FATURACAO_PRIZES : ANGARIACAO_PRIZES;
}

/** Prémios já conquistados (limiar cruzado), do mais recente para o mais antigo. */
export function earnedPrizes(value: number, track: PrizeTrack): Prize[] {
  return prizesFor(track).filter((p) => value >= p.threshold);
}

/** Prémio atual (o mais alto conquistado) ou undefined. */
export function currentPrize(value: number, track: PrizeTrack): Prize | undefined {
  const e = earnedPrizes(value, track);
  return e[e.length - 1];
}

export interface NextPrizeInfo {
  next?: Prize;
  progressPct: number;
  remaining: number;
  /** Base do intervalo atual (limiar anterior ou 0). */
  from: number;
}

/** Próximo prémio + progresso desde o patamar anterior. */
export function nextPrize(value: number, track: PrizeTrack): NextPrizeInfo {
  const list = prizesFor(track);
  const next = list.find((p) => value < p.threshold);
  if (!next) return { next: undefined, progressPct: 100, remaining: 0, from: list[list.length - 1]?.threshold ?? 0 };
  const idx = list.indexOf(next);
  const from = idx > 0 ? list[idx - 1].threshold : 0;
  const span = next.threshold - from;
  const progressPct = span > 0 ? Math.min(100, ((value - from) / span) * 100) : 0;
  return { next, progressPct, remaining: Math.max(0, next.threshold - value), from };
}

/** Frases inspiradoras para o hall da fama (rotativas). */
export const INSPIRATIONAL_QUOTES = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Não contes os negócios que fizeste. Faz com que cada negócio conte.",
  "Os grandes consultores não nasceram feitos — construíram-se, montra a montra.",
  "A tua próxima conquista está a uma chamada de distância.",
  "Quem planta angariações, colhe carreira.",
];

export function quoteForLevel(level: number): string {
  return INSPIRATIONAL_QUOTES[level % INSPIRATIONAL_QUOTES.length];
}
