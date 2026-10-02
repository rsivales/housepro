"use client";

import Link from "next/link";

import { track } from "@/lib/analytics";
import type { Agent, Property } from "@/lib/data/types";
import { PropertyCard } from "@/components/property/property-card";

/**
 * "Talvez também goste" — imóveis semelhantes reais e publicados. Carrossel
 * horizontal com scroll-snap no telemóvel (próximo cartão parcialmente
 * visível); grelha no desktop.
 */
export function SimilarCarousel({
  properties,
  referrer,
}: {
  properties: Property[];
  referrer?: Agent;
}) {
  if (properties.length === 0) return null;

  return (
    <section aria-labelledby="similar-heading">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="similar-heading" className="font-display text-2xl text-[var(--hp-navy)]">
            Talvez também goste
          </h2>
          <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />
        </div>
        <Link href="/imoveis" className="text-sm font-medium text-[var(--hp-red)] hover:underline">
          Ver todos
        </Link>
      </div>

      <div
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
      >
        {properties.map((p) => (
          <div
            key={p.id}
            onClick={() => track("pdp_similar_click")}
            className="w-[82%] shrink-0 snap-start sm:w-auto"
          >
            <PropertyCard property={p} referrer={referrer} />
          </div>
        ))}
      </div>
    </section>
  );
}
