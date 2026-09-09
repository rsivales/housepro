"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { loadSiteContent } from "@/lib/data/site-content";

function ManagedLogo({ kind, fallback, fallbackAlt, className }: { kind: "header" | "footer" | "mark"; fallback: string; fallbackAlt: string; className?: string }) {
  const [asset, setAsset] = React.useState({ src: fallback, alt: fallbackAlt });
  React.useEffect(() => {
    loadSiteContent().then((content) => {
      const config = content.brandassets;
      const src = config?.[kind];
      const alt = config?.[`${kind}Alt` as keyof typeof config];
      if (typeof src === "string" && src) setAsset({ src, alt: typeof alt === "string" && alt ? alt : fallbackAlt });
    });
  }, [kind, fallback, fallbackAlt]);
  return <img src={asset.src} alt={asset.alt} className={cn("w-auto select-none", className)} draggable={false} />;
}

/**
 * Logótipo oficial HousePro (ficheiro da marca, fundo transparente).
 * - `Logo` → lockup horizontal (HOUSEPRO + andorinha), sem slogan — cabeçalhos.
 * - `LogoFull` → lockup completo com o slogan "Paixão pelo que fazemos" — rodapés.
 * Servido em WebP (transparente), funciona sobre fundo claro ou Deep Navy.
 */
export function Logo({ className }: { className?: string }) {
  return <ManagedLogo kind="header" fallback="/brand/housepro-logo.webp" fallbackAlt="HousePro" className={cn("h-7", className)} />;
}

/** Lockup completo com slogan (rodapés / contextos com mais espaço). */
export function LogoFull({ className }: { className?: string }) {
  return <ManagedLogo kind="footer" fallback="/brand/housepro-logo-full.webp" fallbackAlt="HousePro — Paixão pelo que fazemos" className={cn("h-12", className)} />;
}

/** Símbolo compacto para espaços reduzidos, com fallback seguro para a marca horizontal. */
export function LogoMark({ className }: { className?: string }) {
  return <ManagedLogo kind="mark" fallback="/brand/housepro-logo.webp" fallbackAlt="HousePro" className={cn("h-7", className)} />;
}
