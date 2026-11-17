import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProjectFacts, ProjectImage } from "@/components/international/project-facts";
import { currencyPartnerUrl, publicInternationalProjects } from "@/lib/db/international";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Internacional — HousePro",
  description: "Explore empreendimentos internacionais, compare tipologias e preços e fale com a HousePro.",
};

export default async function InternacionalPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, catalog, partnerUrl] = await Promise.all([searchParams, publicInternationalProjects(), currencyPartnerUrl()]);
  const query = typeof q === "string" ? q.trim().toLocaleLowerCase("pt-PT") : "";
  const featured = query ? undefined : catalog.find((project) => project.featured) ?? catalog[0];
  const projects = catalog.filter((project) => project.id !== featured?.id &&
    `${project.title} ${project.country} ${project.city} ${project.partner} ${project.developer ?? ""}`.toLocaleLowerCase("pt-PT").includes(query));

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <header className="mx-auto max-w-7xl px-5 pb-7 pt-12 sm:px-8 sm:pt-16">
          <h1 className="font-display text-4xl tracking-tight sm:text-6xl">HousePro Internacional</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Empreendimentos internacionais com acompanhamento da HousePro em português.</p>
        </header>

        {featured && <section className="mx-auto max-w-7xl px-5 sm:px-8" aria-labelledby="featured-project">
          <div className={`overflow-hidden bg-[#0b243c] text-white ${featured.photo ? "grid lg:grid-cols-[1.35fr_1fr]" : ""}`}>
            <ProjectImage project={featured} className="h-full max-h-[760px] min-h-56 w-full object-cover lg:min-h-[540px]" eager />
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">Em destaque</p>
              <p className="mt-6 text-sm text-white/75">{featured.city}, {featured.country}</p>
              <h2 id="featured-project" className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{featured.title}</h2>
              <p className="mb-6 mt-3 max-w-xl text-sm leading-6 text-white/80">{featured.summary}</p>
              <ProjectFacts project={featured} />
              <Link href={`/internacional/${featured.id}`} className="mt-7 inline-flex w-fit items-center gap-2 border-b border-white/70 pb-1 text-sm font-semibold hover:border-white">
                Explorar empreendimento <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>}

        <section id="projetos" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
            <h2 className="font-display text-3xl sm:text-4xl">{featured ? "Outros empreendimentos" : "Empreendimentos"}</h2>
            <form action="/internacional" className="flex w-full gap-2 sm:w-auto">
              <input type="search" name="q" aria-label="Pesquisar empreendimentos" placeholder="Empreendimento ou localização" defaultValue={q} className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-sm sm:w-60" />
              <button className="rounded-md border px-3 py-2 text-sm font-medium">Pesquisar</button>
              {query && <Link href="/internacional" className="self-center text-sm underline">Limpar</Link>}
            </form>
          </div>
          <div className="grid gap-x-7 gap-y-9 md:grid-cols-2">
            {projects.map((project) => <article key={project.id} className="flex flex-col overflow-hidden border bg-card">
              <ProjectImage project={project} className="aspect-[16/9] w-full object-cover" />
              <div className="flex flex-1 flex-col p-5 sm:p-7">
                <p className="text-sm text-muted-foreground">{project.city}, {project.country}</p>
                <h3 className="mb-3 mt-1 font-display text-3xl">{project.title}</h3>
                <p className="mb-5 text-sm leading-6 text-muted-foreground">{project.summary}</p>
                <ProjectFacts project={project} />
                <div className="mt-auto pt-6">
                  <Link href={`/internacional/${project.id}`} className="inline-flex items-center gap-2 border-b pb-1 text-sm font-semibold" aria-label={`Ver empreendimento ${project.title}`}>
                    Ver empreendimento <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>)}
          </div>
          {!projects.length && <p className="text-sm text-muted-foreground">{query ? "Nenhum empreendimento corresponde à pesquisa." : featured ? "Não há outros empreendimentos disponíveis de momento." : "Consulte-nos para saber que empreendimentos estão disponíveis."}</p>}
        </section>

        <section className="border-t bg-secondary/35">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-10 sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Câmbio e transferências internacionais</p>
              <h2 className="mt-2 font-display text-2xl">Foreign Currency Partners</h2>
              <p className="mt-1 text-sm text-muted-foreground">Peça uma cotação para os pagamentos da sua compra internacional.</p>
            </div>
            {partnerUrl ? <a href={partnerUrl} className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm font-semibold">Pedir cotação <ArrowRight className="size-4" /></a>
              : <Link href="/#contacto" className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm font-semibold">Falar com a HousePro <ArrowRight className="size-4" /></Link>}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
