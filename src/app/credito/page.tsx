import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CreditSimulator } from "@/components/property/credit-simulator";

export const metadata: Metadata = {
  title: "Simulador de crédito habitação",
  description:
    "Simule a prestação do seu crédito habitação em menos de 1 minuto.",
};

export default function CreditoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-primary">Crédito habitação</p>
        <h1 className="mt-1 max-w-2xl font-display text-4xl sm:text-5xl">
          Simule a sua prestação mensal
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Ajuste o valor, a entrada, o prazo e a taxa para uma estimativa
          imediata. Depois, um consultor ajuda-o a encontrar as melhores
          condições.
        </p>

        <div className="mt-10 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <CreditSimulator />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
