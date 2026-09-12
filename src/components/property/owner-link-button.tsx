"use client";

import * as React from "react";
import { Check, Copy, Loader2, UserRound } from "lucide-react";

/** Gera e copia o link do portal do proprietário (só leitura) para enviar ao
 *  dono do imóvel acompanhar o estado, visitas e reservas/CPCV. */
export function OwnerLinkButton({ propertyId }: { propertyId: string }) {
  const [link, setLink] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [err, setErr] = React.useState(false);

  async function generate() {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/properties/owner-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const out = await res.json();
      if (res.ok && out.path) setLink(`${window.location.origin}${out.path}`);
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  if (link) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm shadow-sm">
        <UserRound className="size-4 shrink-0 text-[var(--hp-red)]" />
        <span className="max-w-[46vw] truncate text-[var(--hp-text-2)] sm:max-w-xs">{link}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 font-medium text-[var(--hp-navy)] hover:underline">
          {copied ? <><Check className="size-3.5" /> Copiado</> : <><Copy className="size-3.5" /> Copiar</>}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-black/[0.03]"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4 text-[var(--hp-red)]" />}
      Link do proprietário
      {err && <span className="text-xs text-destructive">· falhou</span>}
    </button>
  );
}
