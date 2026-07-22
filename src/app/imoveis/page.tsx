import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PropertyCard } from "@/components/property/property-card";
import { listProperties } from "@/lib/db/repo";
import { rankedProperties } from "@/lib/data/ranking";

export const metadata: Metadata = { title: "Imóveis" };

type SP = { operacao?: string; local?: string };

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const operacao =
    sp.operacao === "arrendar"
      ? "arrendamento"
      : sp.operacao === "comprar"
        ? "venda"
        : undefined;
  const local = sp.local?.trim();

  let list = rankedProperties(await listProperties());
  if (operacao) list = list.filter((p) => p.operation === operacao);
  if (local) {
    const q = local.toLowerCase();
    list = list.filter((p) =>
      `${p.parish} ${p.municipality}`.toLowerCase().includes(q)
    );
  }

  const heading =
    operacao === "arrendamento"
      ? "Imóveis para arrendar"
      : operacao === "venda"
        ? "Imóveis para comprar"
        : "Todos os imóveis";

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-primary">Resultados</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">{heading}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {local && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-foreground">
              <MapPin className="size-3.5" /> {local}
            </span>
          )}
          <span>
            {list.length} {list.length === 1 ? "imóvel" : "imóveis"}
          </span>
        </div>

        {list.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border bg-card p-10 text-center">
            <p className="font-medium">Sem resultados para esta pesquisa.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Experimente outra localização ou fale com um consultor — muitos
              imóveis ainda não estão publicados.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
