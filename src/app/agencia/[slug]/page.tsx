import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { agencyBySlug, agentsByAgency } from "@/lib/data/mock";
import { listPropertiesByAgency, listSoldByAgency } from "@/lib/db/repo";
import { applyOrdering } from "@/lib/data/ordering";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = agencyBySlug(slug);
  return { title: a ? `${a.name}` : "Agência" };
}

export default async function AgenciaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agency = agencyBySlug(slug);
  if (!agency) notFound();

  const team = agentsByAgency(agency.id);
  const listings = applyOrdering(await listPropertiesByAgency(agency.id), "recentes");
  const sold = await listSoldByAgency(agency.id);

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

        {/* Listings (mais recentes) */}
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

        {/* Últimos vendidos */}
        {sold.length > 0 && (
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
      </main>
      <SiteFooter />
    </div>
  );
}
