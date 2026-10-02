"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { loadSiteContent } from "@/lib/data/site-content";

/**
 * Logótipo do cabeçalho da coleção HousePro Signature. Por defeito mostra o
 * wordmark "HOUSEPRO / SIGNATURE" (texto estilizado); quando o Super Admin
 * publica um logótipo próprio em /admin/website/marca, este substitui o
 * wordmark automaticamente (imagem, fundo transparente).
 */
export function SignatureLogo({ className }: { className?: string }) {
  const [logo, setLogo] = React.useState<{ src: string; alt: string } | null>(null);

  React.useEffect(() => {
    loadSiteContent().then((content) => {
      const src = content.signaturebrand?.logo;
      if (typeof src === "string" && src) {
        setLogo({ src, alt: content.signaturebrand?.logoAlt || "HousePro Signature" });
      }
    });
  }, []);

  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo.src} alt={logo.alt} className={cn("h-10 w-auto select-none", className)} draggable={false} />;
  }

  return (
    <span className={cn("leading-none", className)}>
      <span className="block text-[9px] font-semibold tracking-[.32em]">HOUSEPRO</span>
      <span className="mt-1 block font-serif text-2xl tracking-[.18em]">SIGNATURE</span>
    </span>
  );
}
