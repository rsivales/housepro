"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Maximize2, MapPin, Heart } from "lucide-react";

import { formatPrice, formatArea } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/data/status";
import type { Property } from "@/lib/data/types";

/**
 * "SELEÇÃO HOUSEPRO" — imóveis em destaque com dados reais. Cartão grande
 * horizontal (imagem + detalhe) num carrossel com indicadores; espreita-se o
 * cartão seguinte. Fallback Deep Navy quando o imóvel não tem fotografia.
 */
function isPhoto(src: string) {
  return /\.(jpe?g|png|webp|avif)$/i.test(src);
}

function FeaturedCard({ property }: { property: Property }) {
  const href = `/imovel/${property.id}`;
  return (
    <article className="grid overflow-hidden rounded-3xl border bg-card shadow-sm sm:grid-cols-2">
      <Link href={href} aria-label={property.title} className="relative block aspect-[4/3] sm:aspect-auto">
        {isPhoto(property.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.image} alt={property.title} className="absolute inset-0 size-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #2b5476, #0B1F3A)" }} aria-hidden />
        )}
        {property.status && (
          <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "var(--hp-navy)" }}>
            {STATUS_LABEL[property.status]}
          </span>
        )}
        <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-[var(--hp-navy)] shadow-sm">
          <Heart className="size-4" />
        </span>
      </Link>

      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
        <p className="font-display text-2xl sm:text-3xl">{formatPrice(property)}</p>
        <h3 className="font-display text-lg leading-snug sm:text-xl">
          <Link href={href} className="transition-colors hover:text-[var(--hp-navy)]">{property.title}</Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          {property.parish}, {property.municipality}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {property.typology && <span className="font-medium text-foreground">{property.typology}</span>}
          <span className="flex items-center gap-1.5"><BedDouble className="size-4" /> {property.beds} quartos</span>
          <span className="flex items-center gap-1.5"><Maximize2 className="size-4" /> {formatArea(property.area)}</span>
        </div>
      </div>
    </article>
  );
}

export function FeaturedProperties({ properties }: { properties: Property[] }) {
  const [index, setIndex] = React.useState(0);
  if (properties.length === 0) return null;

  return (
    <section aria-labelledby="featured-title" className="overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="hp-eyebrow">Seleção HousePro</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h2 id="featured-title" className="font-display text-2xl sm:text-3xl">
            Casas com história para começar a sua
          </h2>
        </div>

        {/* Carrossel: cartão atual + espreitar o seguinte */}
        <div className="relative mt-6">
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(calc(${-index} * (88% + 1.5rem)))` }}
            >
              {properties.map((p) => (
                <div key={p.id} className="w-[88%] shrink-0 sm:w-[92%]">
                  <FeaturedCard property={p} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Indicadores + ver todos */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="tablist" aria-label="Escolher imóvel em destaque">
            {properties.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Imóvel ${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: i === index ? 22 : 8, background: i === index ? "var(--hp-red)" : "var(--border)" }}
              />
            ))}
          </div>
          <Link href="/imoveis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70">
            Ver todos os imóveis <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
