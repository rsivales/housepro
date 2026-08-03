import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Coins, Home } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Ferramentas & calculadoras",
  description:
    "Calculadoras gratuitas para quem compra, vende ou investe em imóveis em Portugal: IMT, Imposto de Selo, crédito à habitação e mais.",
};

const tools = [
  {
    href: "/ferramentas/imt",
    icon: Calculator,
    title: "Calculadora de IMT + Imposto de Selo",
    desc: "Quanto vai pagar de impostos ao comprar casa. Escalões 2026, IMT Jovem e crédito à habitação.",
    ready: true,
  },
  {
    href: "/credito",
    icon: Home,
    title: "Simulador de crédito à habitação",
    desc: "Estime a prestação mensal e o esforço do seu crédito.",
    ready: true,
  },
  {
    href: "#",
    icon: Coins,
    title: "Calculadora de mais-valias (em breve)",
    desc: "Estimativa do imposto sobre mais-valias na venda de imóveis.",
    ready: false,
  },
];

export default function FerramentasPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-primary">Grátis · sem registo</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">
            Ferramentas &amp; calculadoras
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Ferramentas úteis para quem compra, vende ou investe em imóveis em
            Portugal. Simples, rápidas e sempre atualizadas.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t, i) => (
            <FadeIn key={t.title} delay={i * 0.06}>
              {t.ready ? (
                <Link
                  href={t.href}
                  className="group flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <t.icon className="size-5" />
                  </div>
                  <h2 className="mt-4 font-display text-lg leading-snug">{t.title}</h2>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Abrir <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-2xl border border-dashed bg-card/50 p-6 opacity-70">
                  <div className="grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
                    <t.icon className="size-5" />
                  </div>
                  <h2 className="mt-4 font-display text-lg leading-snug">{t.title}</h2>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t.desc}</p>
                </div>
              )}
            </FadeIn>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
