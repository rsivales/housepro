import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, HardHat } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { FadeIn } from "@/components/motion/fade-in";
import { listDevelopments } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "Empreendimentos novos",
  description:
    "Obra nova e empreendimentos em pré-venda selecionados pela HousePro — apartamentos e moradias novas com acompanhamento dedicado.",
};

const STAGE_LABEL: Record<string, string> = {
  planta: "Em planta",
  construcao: "Em construção",
  pronto: "Pronto a habitar",
};

export default async function EmpreendimentosPage() {
  const list = await listDevelopments();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <FadeIn>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Building2 className="size-3.5" /> Obra nova
              </p>
              <h1 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
                Empreendimentos novos
              </h1>
              <p className="mt-3 max-w-xl text-primary-foreground/85">
                Apartamentos e moradias de construção nova, em pré-venda ou
                prontos a habitar — com plantas, acabamentos e acompanhamento de
                um consultor dedicado do início à escritura.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          {list.length > 0 ? (
            <>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl sm:text-3xl">
                  Em comercialização
                </h2>
                <span className="text-sm text-muted-foreground">
                  {list.length} {list.length === 1 ? "empreendimento" : "empreendimentos"}
                </span>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <div key={p.id} className="relative">
                    {p.developmentStage && (
                      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-black shadow">
                        <HardHat className="size-3.5" />
                        {STAGE_LABEL[p.developmentStage] ?? "Obra nova"}
                      </span>
                    )}
                    <PropertyCard property={p} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <Building2 className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 font-display text-2xl">
                Novos empreendimentos a caminho
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Estamos a preparar os próximos lançamentos de obra nova. Fale com
                um consultor para conhecer as oportunidades em primeira mão.
              </p>
              <Link
                href="/imoveis"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
              >
                Ver todos os imóveis <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
