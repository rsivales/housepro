"use client";

import * as React from "react";
import { Check, Link2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/icons/whatsapp";

/**
 * Lets a consultant send a listing to a client from their professional area.
 * The generated link carries ?ref=<consultant>, so the client's contact is
 * attributed to THIS consultant — even for a colleague's listing.
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
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.housepro.pt";
    return `${origin}/imovel/${propertyId}?ref=${consultantId}`;
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

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `Veja este imóvel (${reference}) que selecionei para si: ${shareUrl()}`
  )}`;

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
      <Button size="sm" className="flex-1" asChild>
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          <Send className="size-4" /> Enviar a cliente
        </a>
      </Button>
      <span className="sr-only">
        <WhatsappIcon />
      </span>
    </div>
  );
}
