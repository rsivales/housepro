"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

/**
 * Resgata automaticamente um código de padrinho pendente (guardado no /entrar)
 * assim que o consultor chega à área — cobre login por password e magic-link.
 */
export function PadrinhoAutoRedeem() {
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let code: string | null = null;
    try { code = localStorage.getItem("housepro:padrinho"); } catch {}
    if (!code) return;
    // Evita repetir se falhar por já estar ligado.
    try { localStorage.removeItem("housepro:padrinho"); } catch {}

    fetch("/api/sponsor/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((out) => {
        if (out?.ok) {
          setMsg(out.sponsorName ? `Ligado ao padrinho ${out.sponsorName}.` : "Padrinho ligado com sucesso.");
        }
      })
      .catch(() => {});
  }, []);

  if (!msg) return null;
  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-sm">
      <Check className="size-4 shrink-0 text-primary" />
      <span className="flex-1">{msg}</span>
      <button type="button" onClick={() => setMsg(null)} className="text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
