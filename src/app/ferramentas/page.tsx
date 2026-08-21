import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";
import { CalculatorsTabs } from "@/components/tools/calculators-tabs";

export const metadata: Metadata = {
  title: "Ferramentas & calculadoras imobiliárias",
  description:
    "Todas as calculadoras HousePro numa página: IMT e Imposto de Selo, crédito à habitação e mais-valias na venda de imóveis em Portugal. Grátis e indicativas.",
  keywords: [
    "calculadora IMT",
    "simulador crédito habitação",
    "calculadora mais-valias",
    "impostos comprar casa",
    "mais-valias venda imóvel",
  ],
  alternates: { canonical: "/ferramentas" },
};

export default function FerramentasPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-primary">Grátis · sem registo · resultados indicativos</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Ferramentas &amp; calculadoras</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Todas as calculadoras numa só página. Estime os impostos da compra (IMT e Imposto de
            Selo), a prestação do crédito à habitação e o imposto sobre mais-valias na venda.
          </p>
        </FadeIn>

        <div className="mt-8">
          <CalculatorsTabs />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
