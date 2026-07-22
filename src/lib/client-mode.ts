"use client";

import * as React from "react";

/**
 * "Modo cliente" — quando o consultor mostra o ecrã ao cliente, esconde a
 * informação interna (comissões, estado documental) mas mantém os dados do
 * imóvel visíveis. Guardado no navegador do consultor.
 */
export const CLIENT_MODE_KEY = "housepro:clientMode";
const EVENT = "housepro:clientmode";

export function setClientMode(on: boolean) {
  try {
    localStorage.setItem(CLIENT_MODE_KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/** `ready` evita flash de informação interna antes de sabermos o modo. */
export function useClientMode(): { ready: boolean; clientMode: boolean } {
  const [state, setState] = React.useState({ ready: false, clientMode: false });
  React.useEffect(() => {
    const read = () =>
      setState({ ready: true, clientMode: localStorage.getItem(CLIENT_MODE_KEY) === "1" });
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return state;
}
