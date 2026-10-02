"use client";

/**
 * Favoritos do comprador. Quando há conta (magic link) persistem no Supabase
 * via /api/cliente/favoritos; sem conta ficam no localStorage. O localStorage é
 * também cache/fallback, e os favoritos locais são migrados para a conta ao
 * entrar. Emite o evento "housepro:favoritos" para a UI reagir.
 */

export const FAV_KEY = "housepro:favoritos";

let loggedIn: boolean | null = null;
let ids: Set<string> = new Set();
let loadPromise: Promise<string[]> | null = null;

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(list: string[]) {
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch {
    /* quota — ignora */
  }
}
function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("housepro:favoritos"));
}

/** Carrega os favoritos (uma vez): servidor se houver conta, senão localStorage. */
export function loadFavorites(): Promise<string[]> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const local = readLocal();
    try {
      const res = await fetch("/api/cliente/favoritos");
      if (res.status === 200) {
        loggedIn = true;
        const j = (await res.json()) as { ids?: string[] };
        const server = new Set(j.ids ?? []);
        // Migra favoritos locais que ainda não estão na conta.
        const toMigrate = local.filter((id) => !server.has(id));
        if (toMigrate.length) {
          try {
            await fetch("/api/cliente/favoritos", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ids: toMigrate }),
            });
            toMigrate.forEach((id) => server.add(id));
          } catch {
            /* best-effort */
          }
        }
        ids = server;
      } else {
        loggedIn = false;
        ids = new Set(local);
      }
    } catch {
      loggedIn = false;
      ids = new Set(local);
    }
    writeLocal([...ids]); // cache
    return [...ids];
  })();
  return loadPromise;
}

export function isLoggedIn(): boolean | null {
  return loggedIn;
}

export function currentFavorites(): string[] {
  return [...ids];
}

/** Alterna um favorito. Devolve o novo estado (true = guardado). */
export async function toggleFavorite(propertyId: string): Promise<boolean> {
  await loadFavorites();
  const has = ids.has(propertyId);
  if (has) ids.delete(propertyId);
  else ids.add(propertyId);
  writeLocal([...ids]);
  emit();

  if (loggedIn) {
    try {
      if (has) {
        await fetch(`/api/cliente/favoritos?propertyId=${encodeURIComponent(propertyId)}`, { method: "DELETE" });
      } else {
        await fetch("/api/cliente/favoritos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
      }
    } catch {
      /* offline — o localStorage mantém o estado até ao próximo load */
    }
  }
  return !has;
}
