import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Newspaper, Wrench } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { TopConcelhos } from "@/components/home/top-concelhos";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { listPropertiesByAgency, listSoldByAgency, getAgencyBySlug, listActiveAgentsByAgency } from "@/lib/db/repo";
import { applyOrdering } from "@/lib/data/ordering";
import { topConcelhos } from "@/lib/data/concelhos";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getAgencyBySlug(slug);
  return { title: a ? `${a.name}` : "Agência" };
}

export default async function AgenciaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency || agency.suspended) notFound();

  const team = await listActiveAgentsByAgency(agency.id);
  const allListings = applyOrdering(await listPropertiesByAgency(agency.id), "recentes");
  // "Em reserva" tem secção própria — não duplica na grelha principal de ativos.
  const listings = allListings.filter((p) => p.status !== "reservado");
  const reserved = allListings.filter((p) => p.status === "reservado");
  const sold = await listSoldByAgency(agency.id);
  const concelhos = topConcelhos(listings, 3);
  const showActive = agency.showActive !== false;
  const showSold = agency.showSold !== false;
  const showReserved = agency.showReserved !== false;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        {/* Montra header */}
        <section className="border-b bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <MapPin className="size-4" /> Montra da agência
            </p>
            <h1 className="mt-1 font-display text-4xl sm:text-5xl">{agency.name}</h1>
            <p className="mt-2 text-muted-foreground">{agency.region}</p>
            {agency.description && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{agency.description}</p>
            )}

            {agency.services && agency.services.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {agency.services.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
                    <Wrench className="size-3.5 text-primary" /> {s}
                  </span>
                ))}
              </div>
            )}

            {team.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {team.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/consultor/${agent.id}`}
                    className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm shadow-sm transition-colors hover:bg-secondary"
                  >
                    <AgentAvatar agent={agent} className="size-7" />
                    <span className="font-medium">{agent.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Listings (mais recentes) — o broker decide se esta secção aparece */}
        {showActive && (
          <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl sm:text-3xl">Imóveis mais recentes</h2>
              <span className="text-sm text-muted-foreground">
                {listings.length} {listings.length === 1 ? "imóvel" : "imóveis"}
              </span>
            </div>
            {listings.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-muted-foreground">
                Esta agência ainda não tem imóveis publicados.
              </p>
            )}
          </section>
        )}

        {/* Concelhos mais procurados (âmbito da agência) */}
        {concelhos.length > 0 && (
          <div className="border-t bg-secondary/40">
            <TopConcelhos
              concelhos={concelhos}
              scopeLabel={`Onde ${agency.name} tem mais procura`}
            />
          </div>
        )}

        {/* Em reserva */}
        {showReserved && reserved.length > 0 && (
          <section className="border-t py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="font-display text-2xl sm:text-3xl">Em reserva</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Negócio em curso — ainda não fechado.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {reserved.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Últimos vendidos */}
        {showSold && sold.length > 0 && (
          <section className="border-t bg-secondary/40 py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="font-display text-2xl sm:text-3xl">Últimos vendidos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Resultados que falam por si.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sold.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Notícias locais / comunicados */}
        {agency.news && agency.news.length > 0 && (
          <section className="border-t py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="flex items-center gap-2 font-display text-2xl sm:text-3xl">
                <Newspaper className="size-6 text-primary" /> Notícias e comunicados
              </h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {agency.news.map((n) => (
                  <article key={n.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    <h3 className="mt-1 font-display text-lg">{n.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Aviso legal — gestão independente */}
        <section className="border-t bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">
                Gestão independente.
              </strong>{" "}
              A agência {agency.name} é gerida de forma autónoma e independente
              pelos seus responsáveis. A marca HousePro disponibiliza a plataforma
              e a montra online, mas não é responsável pela gestão, pelos atos,
              contratos ou obrigações desta agência — que respondem exclusivamente
              perante os seus próprios titulares.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
