import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PropertyCard } from "@/components/property/property-card";
import type { Property } from "@/lib/data/types";

/**
 * "SELEÇÃO HOUSEPRO" — imóveis em destaque com dados reais (PropertyCard).
 * Carrossel horizontal com snap em mobile; grelha em desktop.
 */
export function FeaturedProperties({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return null;

  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hp-eyebrow">Seleção HousePro</p>
          <h2 id="featured-title" className="mt-1 font-display text-2xl sm:text-3xl">
            Casas com história para começar a sua
          </h2>
        </div>
        <Link
          href="/imoveis"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70"
        >
          Ver todos os imóveis <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Mobile: carrossel horizontal · Desktop: grelha */}
      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {properties.map((property) => (
          <div key={property.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
            <PropertyCard property={property} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
