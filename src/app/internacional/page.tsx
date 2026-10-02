import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Globe2, Handshake, MapPin, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { internationalProjects } from "@/lib/data/international";

export const metadata: Metadata = {
  title: "Internacional — projetos no estrangeiro",
  description: "Projetos internacionais que a HousePro divulga através de parcerias autorizadas.",
};

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function InternacionalPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const projects = internationalProjects.filter((p) =>
    !query || `${p.title} ${p.country} ${p.city} ${p.partner}`.toLowerCase().includes(query)
  );
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#061b34] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_35%,rgba(39,142,205,.5),transparent_25%),radial-gradient(circle_at_86%_65%,rgba(235,179,78,.22),transparent_28%),linear-gradient(120deg,#06172d,#082d55_55%,#071525)]" />
        <div className="absolute -bottom-20 right-[10%] -z-10 text-[20rem] font-black leading-none text-white/[.035]">DXB</div>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_360px] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100"><Globe2 className="size-4" /> HousePro Internacional</p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">O próximo capítulo do seu património começa no mundo.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">Projetos selecionados com parceiros locais validados, informação transparente e acompanhamento português do primeiro contacto à compra.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-white/10 px-4 py-2">Dubai em destaque</span><span className="rounded-full bg-white/10 px-4 py-2">Parcerias documentadas</span><span className="rounded-full bg-white/10 px-4 py-2">Acompanhamento dedicado</span></div>
          </div>
          <aside className="self-end rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><p className="flex items-center gap-2 text-sm font-semibold text-amber-200"><Sparkles className="size-4" /> Em destaque</p><p className="mt-4 text-xs uppercase tracking-[.18em] text-white/60">Dubai · Emirados Árabes Unidos</p><h2 className="mt-2 font-display text-3xl">Viver e investir onde a cidade não para.</h2><a href="#projetos" className="mt-6 inline-flex items-center gap-2 font-semibold text-white underline underline-offset-4">Ver projetos no Dubai <ArrowRight className="size-4" /></a></aside>
        </div>
      </section>

      {/* Projetos */}
      <main id="projetos" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p) => (
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

        {projects.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Não encontrámos projetos com essa pesquisa.</p>
        )}

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
