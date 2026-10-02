"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";

import { track } from "@/lib/analytics";

/** Botão de partilha claro para o hero. Usa a partilha nativa ou copia o URL. */
export function HeroShareButton({ title }: { title: string }) {
  const [copied, setCopied] = React.useState(false);

  async function share() {
    track("pdp_share");
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelado — cai para copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Partilhar imóvel"
      className="grid size-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
    >
      {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
    </button>
  );
}
