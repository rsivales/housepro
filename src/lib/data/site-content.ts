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
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ── Persistência global (Supabase via /api/brand/site-content) ─────────── */

type Section = "banners" | "stories" | "vacancies" | "newsimg" | "homerule";

/** Publica uma secção arbitrária (ex.: regra de ordenação da homepage). */
export function publishSection(section: Section, value: unknown): Promise<SaveResult> {
  return putSection(section, value);
}

export type SaveResult = { ok: boolean; persisted: boolean; error?: string };

const saveQueues = new Map<Section, Promise<SaveResult>>();

/** Publica por ordem e só confirma quando o servidor realmente gravou. */
function putSection(section: Section, value: unknown): Promise<SaveResult> {
  if (typeof window === "undefined") return Promise.resolve({ ok: false, persisted: false, error: "browser_only" });
  const previous = saveQueues.get(section) ?? Promise.resolve({ ok: true, persisted: false });
  const next = previous
    .catch(() => ({ ok: false, persisted: false }))
    .then(async () => {
      try {
        const response = await fetch("/api/brand/site-content", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ section, value }),
        });
        const result = (await response.json().catch(() => ({}))) as { persisted?: boolean; error?: string };
        if (!response.ok || !result.persisted) {
          return { ok: false, persisted: false, error: result.error ?? "save_failed" };
        }
        serverCache = null;
        return { ok: true, persisted: true };
      } catch {
        return { ok: false, persisted: false, error: "network_error" };
      }
    });
  saveQueues.set(section, next);
  return next;
}

export interface ServerContent {
  banners?: Banner[];
  stories?: Story[];
  vacancies?: Vacancy[];
  newsimg?: NewsImageMap;
  homerule?: string;
}

let serverCache: Promise<ServerContent> | null = null;

/**
 * Lê (uma vez por sessão de página) os conteúdos publicados no servidor. Os
 * componentes públicos usam isto e caem para o localStorage/defaults quando a
 * secção ainda não foi publicada (ou em modo demo).
 */
export function loadSiteContent(fresh = false): Promise<ServerContent> {
  if (typeof window === "undefined") return Promise.resolve({});
  if (fresh) serverCache = null;
  if (!serverCache) {
    serverCache = fetch("/api/brand/site-content")
      .then((r) => (r.ok ? r.json() : { content: {} }))
      .then((j) => (j && typeof j.content === "object" ? (j.content as ServerContent) : {}))
      .catch(() => ({}));
  }
  return serverCache;
}

/* ── Banners ───────────────────────────────────────────────────────────── */
export function readBanners(): Banner[] {
  const stored = readJSON<Banner[] | null>(BANNERS_KEY, null);
  return stored && stored.length > 0 ? stored : DEFAULT_BANNERS;
}
export function writeBanners(banners: Banner[]): Promise<SaveResult> {
  writeJSON(BANNERS_KEY, banners);
  return putSection("banners", banners);
}

/* ── Histórias reais ───────────────────────────────────────────────────── */
export function readStories(): Story[] {
  return readJSON<Story[]>(STORIES_KEY, []);
}
export function writeStories(stories: Story[]): Promise<SaveResult> {
  writeJSON(STORIES_KEY, stories);
  return putSection("stories", stories);
}

/* ── Vagas (carreiras) ─────────────────────────────────────────────────── */
export function readVacancies(): Vacancy[] {
  const stored = readJSON<Vacancy[] | null>(VACANCIES_KEY, null);
  return stored ?? VACANCIES;
}
export function writeVacancies(vacancies: Vacancy[]): Promise<SaveResult> {
  writeJSON(VACANCIES_KEY, vacancies);
  return putSection("vacancies", vacancies);
}

/* ── Imagens de artigos (Guia HousePro) ────────────────────────────────── */
export type NewsImageMap = Record<string, string>;
export function readNewsImages(): NewsImageMap {
  return readJSON<NewsImageMap>(NEWSIMG_KEY, {});
}
export function writeNewsImages(map: NewsImageMap): Promise<SaveResult> {
  writeJSON(NEWSIMG_KEY, map);
  return putSection("newsimg", map);
}

export type UploadProgress = { percent: number; label: string };

/** Redimensiona antes do envio: boa qualidade visual sem pedidos de vários MB. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1920;
  const maxHeight = 1200;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_processing_failed");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image_processing_failed")), "image/webp", 0.84);
  });
}

/** Comprime, envia para o Storage e só devolve depois de existir um URL público. */
export async function uploadSiteImage(
  file: File,
  area: "banners" | "articles" | "stories",
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_image");
  onProgress?.({ percent: 10, label: "A preparar imagem…" });
  const blob = await compressImage(file);
  onProgress?.({ percent: 42, label: "A enviar imagem…" });

  if (!isSupabaseConfigured()) throw new Error("storage_not_configured");
  const supabase = createClient();
  const safeBase = file.name.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "imagem";
  const path = `site-content/${area}/${safeBase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
  const result = await supabase.storage.from("property-media").upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (result.error) throw new Error(result.error.message || "upload_failed");
  onProgress?.({ percent: 82, label: "A guardar no website…" });
  const url = supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl;
  if (!url) throw new Error("public_url_failed");
  return url;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
