import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Logótipo oficial HousePro (ficheiro da marca, fundo transparente).
 * - `Logo` → lockup horizontal (HOUSEPRO + andorinha), sem slogan — cabeçalhos.
 * - `LogoFull` → lockup completo com o slogan "Paixão pelo que fazemos" — rodapés.
 * Servido em WebP (transparente), funciona sobre fundo claro ou Deep Navy.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/housepro-logo.webp"
      alt="HousePro"
      className={cn("h-7 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** Lockup completo com slogan (rodapés / contextos com mais espaço). */
export function LogoFull({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/housepro-logo-full.webp"
      alt="HousePro — Paixão pelo que fazemos"
      className={cn("h-12 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** Compatibilidade: usado internamente; devolve o lockup horizontal. */
export function LogoMark({ className }: { className?: string }) {
  return <Logo className={className} />;
}
