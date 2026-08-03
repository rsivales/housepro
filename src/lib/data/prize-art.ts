/**
 * Artes dedicadas dos prémios (troféus/renders), carregadas pela marca.
 * Protótipo em browser (localStorage); em produção migra para o Supabase
 * (site_settings), tal como a marca de água. As chaves são os nomes dos prémios.
 */

export const PRIZE_ART_KEY = "housepro:prizeArt";

export type PrizeArtMap = Record<string, string>;

export function readPrizeArt(): PrizeArtMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PRIZE_ART_KEY);
    return raw ? (JSON.parse(raw) as PrizeArtMap) : {};
  } catch {
    return {};
  }
}

export function savePrizeArt(map: PrizeArtMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRIZE_ART_KEY, JSON.stringify(map));
  } catch {
    /* ignora quota */
  }
}
