import type { Property } from "./types";

/**
 * "Concelhos mais procurados" — agrega a procura por concelho (município)
 * a partir dos imóveis disponíveis, para a marca (global) ou para uma agência.
 *
 * Procura = soma do `interest` (proxy de visitas+leads+favoritos) dos imóveis
 * do concelho, com um pequeno bónus por número de imóveis (oferta ativa).
 * Assim o destaque reflete o que os clientes mais veem, não só o que existe.
 */
export interface ConcelhoProcura {
  /** Nome do concelho (município). */
  name: string;
  /** Distrito, quando conhecido (para legenda). */
  district?: string;
  /** Nº de imóveis ativos nesse concelho. */
  count: number;
  /** Índice de procura agregado (para ordenar). */
  demand: number;
  /** Foto representativa (capa de imóvel do concelho ou imagem curada). */
  image: string;
  /** Link para a montra filtrada por este concelho. */
  href: string;
}

/** Fotos de concelho carregadas pela administração (substituem o automático). */
export type ConcelhoPhotos = Record<string, string>;

function keyOf(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Escolhe a imagem para o concelho, por ordem de preferência:
 *  1) foto carregada pela administração (overrides — a mais fiável e editorial),
 *  2) capa do imóvel de maior procura do concelho (foto real da zona),
 *  3) gradiente (string vazia → o cartão desenha um fundo com o nome).
 *
 * Evita-se depender de URLs externos "adivinhados" (partem-se com facilidade);
 * a via profissional é a administração carregar uma foto por concelho, com a
 * capa de um imóvel real como recurso automático entretanto.
 */
function pickImage(
  name: string,
  best: Property | undefined,
  overrides?: ConcelhoPhotos
): string {
  const k = keyOf(name);
  if (overrides?.[k]) return overrides[k];
  if (best?.image) return best.image;
  return "";
}

/**
 * Top N concelhos por procura. `properties` já deve vir filtrada ao âmbito
 * pretendido (global = todos; agência = só os da agência).
 */
export function topConcelhos(
  properties: Property[],
  n = 3,
  overrides?: ConcelhoPhotos
): ConcelhoProcura[] {
  const groups = new Map<
    string,
    { name: string; district?: string; count: number; demand: number; best?: Property }
  >();

  for (const p of properties) {
    const name = p.municipality?.trim();
    if (!name) continue;
    const k = keyOf(name);
    const g =
      groups.get(k) ?? { name, district: p.district, count: 0, demand: 0, best: undefined };
    g.count += 1;
    g.demand += (p.interest ?? 0) + 2; // +2 por imóvel: oferta ativa conta
    if (!g.best || (p.interest ?? 0) > (g.best.interest ?? 0)) g.best = p;
    if (!g.district && p.district) g.district = p.district;
    groups.set(k, g);
  }

  return [...groups.values()]
    .sort((a, b) => b.demand - a.demand)
    .slice(0, n)
    .map((g) => ({
      name: g.name,
      district: g.district,
      count: g.count,
      demand: g.demand,
      image: pickImage(g.name, g.best, overrides),
      href: `/imoveis?local=${encodeURIComponent(g.name)}`,
    }));
}
