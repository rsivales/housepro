import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Globe2, Handshake, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { internationalProjects } from "@/lib/data/international";

export const metadata: Metadata = {
  title: "Internacional — projetos no estrangeiro",
  description: "Projetos internacionais que a HousePro divulga através de parcerias autorizadas.",
};

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function InternacionalPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/15 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Globe2 className="size-4" /> HousePro Internacional
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            Investir além-fronteiras, com a confiança HousePro
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Selecionámos projetos internacionais de nova construção que divulgamos
            através de <strong>parcerias autorizadas</strong> — como o Dubai. Cada
            oportunidade é acompanhada por um consultor HousePro, com informação clara
            e nota fiscal para o investidor português.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
            <Handshake className="size-4 text-primary" /> Divulgação autorizada por parceria
          </div>
        </div>
      </section>

      {/* Projetos */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {internationalProjects.map((p) => (
            <Link
              key={p.id}
              href={`/internacional/${p.id}`}
              className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`relative flex aspect-[16/9] items-end bg-gradient-to-br ${p.tint} p-5`}>
                <span className="absolute right-4 top-4 text-3xl">{p.flag}</span>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <MapPin className="size-3.5" /> {p.city}, {p.country}
                  </p>
                  <h2 className="mt-1 font-display text-2xl">{p.title}</h2>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">{p.summary}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold">Desde {eur.format(p.priceFrom)}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Building2 className="size-4" /> {p.typologies}</span>
                  {p.deliveryYear && <span className="text-muted-foreground">Entrega {p.deliveryYear}</span>}
                </div>
                <p className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Ver projeto <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border bg-secondary/40 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Tem um projeto internacional para divulgar?</p>
          <p className="mt-1">
            Trabalhamos com parceiros locais autorizados. Fale connosco para avaliar a
            inclusão do seu projeto na montra internacional HousePro.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
