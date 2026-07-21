import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Hammer, Repeat, TrendingUp } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Investir",
  description:
    "Soluções de investimento imobiliário: rendimento, reabilitação e revenda.",
};

const solutions = [
  {
    icon: TrendingUp,
    title: "Rendimento (arrendamento)",
    desc: "Imóveis com yield atrativo para arrendamento tradicional ou de curta duração.",
    kpi: "Yield 5–8%",
  },
  {
    icon: Hammer,
    title: "Reabilitação",
    desc: "Oportunidades para renovar e valorizar, com estimativa de obra e mais-valia.",
    kpi: "Mais-valia 15–30%",
  },
  {
    icon: Repeat,
    title: "Revenda (fix & flip)",
    desc: "Compra abaixo do mercado, valorização e revenda em prazo curto.",
    kpi: "Ciclo 6–12 meses",
  },
  {
    icon: Building2,
    title: "Portefólio",
    desc: "Acompanhamento de carteira e diversificação por zona e tipologia.",
    kpi: "Gestão dedicada",
  },
];

export default function InvestirPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-medium text-primary">Investir</p>
          <h1 className="mt-1 max-w-2xl font-display text-4xl sm:text-5xl">
            Soluções de investimento imobiliário
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Do primeiro imóvel de rendimento a uma carteira diversificada — a
            HousePro identifica oportunidades e trata de tudo consigo.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {solutions.map((s) => (
              <div key={s.title} className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-foreground">
                    {s.kpi}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-xl">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border bg-secondary/40 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm text-muted-foreground">
              Quer receber oportunidades de investimento alinhadas com o seu
              perfil? Fale com um consultor especializado.
            </p>
            <Button variant="brand" size="lg" asChild>
              <Link href="/vender#contacto">Falar com um consultor</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
