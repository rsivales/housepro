"use client";

import * as React from "react";

/**
 * Persistência das preferências do consultor (Helix). Server-first: lê/escreve
 * em profiles.settings via /api/me/settings quando há sessão; caso contrário
 * (modo demo/offline) usa localStorage. O localStorage funciona também como
 * cache instantânea e fallback quando a rede falha.
 */

type Settings = Record<string, unknown>;

let cache: Promise<Settings | null> | null = null;

/** Lê (uma vez por sessão de página) todas as preferências do servidor. */
function fetchAll(): Promise<Settings | null> {
  if (!cache) {
    cache = fetch("/api/me/settings")
      .then((r) => (r.ok ? r.json() : { settings: null }))
      .then((j) => (j && typeof j.settings === "object" ? (j.settings as Settings) : null))
      .catch(() => null);
  }
  return cache;
}

function readLocal<T>(localKey: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(localKey);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeLocal(localKey: string, value: unknown) {
  try {
    window.localStorage.setItem(localKey, JSON.stringify(value));
  } catch {
    /* quota/indisponível — ignora */
  }
}

async function putSetting(key: string, value: unknown): Promise<void> {
  try {
    await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patch: { [key]: value } }),
    });
  } catch {
    /* offline — o localStorage mantém o valor */
  }
}

/**
 * Hook de preferência persistente. Devolve [value, setValue, ready].
 * - `ready` fica true quando a leitura inicial terminou (evita "flash").
 * - Escreve sempre no servidor (quando há sessão) e no localStorage (cache).
 */
export function useSetting<T>(
  key: string,
  localKey: string,
  initial: T
): [T, (next: T) => void, boolean] {
  const [value, setValue] = React.useState<T>(initial);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const server = await fetchAll();
      if (!alive) return;
      if (server && key in server && server[key] != null) {
        setValue(server[key] as T);
      } else {
        const local = readLocal<T>(localKey);
        if (local !== undefined) {
          setValue(local);
          // Migra o valor local para o servidor (best-effort) na 1.ª vez.
          if (server) void putSetting(key, local);
        }
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [key, localKey]);

  const update = React.useCallback(
    (next: T) => {
      setValue(next);
      writeLocal(localKey, next);
      void putSetting(key, next);
    },
    [key, localKey]
  );

  return [value, update, ready];
}
