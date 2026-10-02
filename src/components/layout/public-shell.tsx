import type { ReactNode } from "react";

import { PublicHeader } from "@/components/home/public-header";
import { PublicFooter } from "@/components/home/public-footer";

/**
 * Moldura ÚNICA das páginas públicas (fora da homepage): escopo visual `.hp`,
 * cabeçalho sólido e rodapé — os mesmos da homepage. Mudar o cabeçalho, o
 * rodapé ou os tokens `.hp` passa a refletir-se em TODAS as páginas que usam
 * este shell, sem editar cada página.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="hp flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader solid />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
