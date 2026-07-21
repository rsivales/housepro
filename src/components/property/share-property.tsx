"use client";

import * as React from "react";
import { Check, Link2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Lets a consultant send a listing to a client from their professional area.
 * The generated link carries ?ref=<consultant>, so the client's contact is
 * attributed to THIS consultant — even for a colleague's listing.
 *
 * URLs are built at click time (client-only) to avoid SSR/CSR hydration
 * mismatches on window.location.
 */
export function ShareProperty({
  propertyId,
  reference,
  consultantId,
}: {
  propertyId: string;
  reference: string;
  consultantId: string;
}) {
  const [copied, setCopied] = React.useState(false);

  function shareUrl() {
    return `${window.location.origin}/imovel/${propertyId}?ref=${consultantId}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  function sendToClient() {
    const text = `Veja este imóvel (${reference}) que selecionei para si: ${shareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={copy}>
        {copied ? (
          <>
            <Check className="size-4" /> Copiado
          </>
        ) : (
          <>
            <Link2 className="size-4" /> Copiar link
          </>
        )}
      </Button>
      <Button size="sm" className="flex-1" onClick={sendToClient}>
        <Send className="size-4" /> Enviar a cliente
      </Button>
    </div>
  );
}
