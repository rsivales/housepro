/**
 * Conteúdos da homepage pública geríveis pelo admin (banners, histórias reais,
 * vagas e imagens de artigos).
 *
 * Padrão idêntico ao resto do admin (ver marca de água): no protótipo persiste
 * em `localStorage` (pré-visualização por navegador) e, quando o Supabase
 * estiver ligado, os mesmos dados passam a ser publicados globalmente. As
 * funções de leitura são SSR-safe (devolvem os valores por defeito no servidor)
 * para os componentes públicos poderem hidratar no cliente sem partir o SSR.
 */

import { DEFAULT_BANNERS, type Banner } from "@/lib/data/banners";
import { VACANCIES, type Vacancy } from "@/lib/data/careers";
import { type Story } from "@/lib/data/stories";

export const BANNERS_KEY = "housepro:hp:banners";
export const STORIES_KEY = "housepro:hp:stories";
export const VACANCIES_KEY = "housepro:hp:vacancies";
export const NEWSIMG_KEY = "housepro:hp:newsimg";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/again — ignora no protótipo */
  }
}

/* ── Banners ───────────────────────────────────────────────────────────── */
export function readBanners(): Banner[] {
  const stored = readJSON<Banner[] | null>(BANNERS_KEY, null);
  return stored && stored.length > 0 ? stored : DEFAULT_BANNERS;
}
export function writeBanners(banners: Banner[]): void {
  writeJSON(BANNERS_KEY, banners);
}

/* ── Histórias reais ───────────────────────────────────────────────────── */
export function readStories(): Story[] {
  return readJSON<Story[]>(STORIES_KEY, []);
}
export function writeStories(stories: Story[]): void {
  writeJSON(STORIES_KEY, stories);
}

/* ── Vagas (carreiras) ─────────────────────────────────────────────────── */
export function readVacancies(): Vacancy[] {
  const stored = readJSON<Vacancy[] | null>(VACANCIES_KEY, null);
  return stored ?? VACANCIES;
}
export function writeVacancies(vacancies: Vacancy[]): void {
  writeJSON(VACANCIES_KEY, vacancies);
}

/* ── Imagens de artigos (Guia HousePro) ────────────────────────────────── */
export type NewsImageMap = Record<string, string>;
export function readNewsImages(): NewsImageMap {
  return readJSON<NewsImageMap>(NEWSIMG_KEY, {});
}
export function writeNewsImages(map: NewsImageMap): void {
  writeJSON(NEWSIMG_KEY, map);
}

/** Lê um ficheiro de imagem como data URL (protótipo em browser). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("leitura"));
    fr.readAsDataURL(file);
  });
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
