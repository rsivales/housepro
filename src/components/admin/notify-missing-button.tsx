"use client";

import * as React from "react";
import { Send, Check } from "lucide-react";

export function NotifyMissingButton({ propertyId }: { propertyId: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "done">("idle");

  async function go() {
    setState("sending");
    try {
      await fetch("/api/notify-missing-docs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      setState("done");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={state !== "idle"}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60"
    >
      {state === "done" ? (
        <>
          <Check className="size-3.5" /> Agente notificado
        </>
      ) : state === "sending" ? (
        "A enviar…"
      ) : (
        <>
          <Send className="size-3.5" /> Notificar agente
        </>
      )}
    </button>
  );
}
