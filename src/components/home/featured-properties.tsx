"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Bath, Maximize2, MapPin } from "lucide-react";

import { formatPrice, formatArea } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/data/status";
import type { Property } from "@/lib/data/types";
import { SafeImage } from "@/components/home/safe-image";
import { FavoriteButton } from "@/components/property/favorite-button";

const PROPERTY_FALLBACK = "/news/geral.webp";

/**
 * "SELEÇÃO HOUSEPRO" — imóveis em destaque com dados reais. Carrossel
 * horizontal com scroll-snap (sem autoplay): 1.º cartão a ~88% da largura,
 * parte do 2.º visível. Imagem à esquerda, informação à direita.
 */
function FeaturedCard({ property }: { property: Property }) {
  const href = `/imovel/${property.id}`;
  return (
    <article className="grid h-full grid-cols-[1.05fr_1fr] overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Link href={href} aria-label={property.title} className="relative block">
        <SafeImage
          src={property.image}
          fallback={PROPERTY_FALLBACK}
          alt={`${property.type} ${property.typology ?? ""} em ${property.parish}, ${property.municipality}`}
          className="absolute inset-0 size-full object-cover"
        />
        {property.status && (
          <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: "var(--hp-navy)" }}>
            {STATUS_LABEL[property.status]}
          </span>
        )}
        <div className="absolute right-3 top-3">
          <FavoriteButton propertyId={property.id} />
        </div>
      </Link>

      <div className="flex flex-col justify-center gap-2 p-4 sm:p-5">
        <p className="font-display text-xl leading-none sm:text-2xl">{formatPrice(property)}</p>
        <h3 className="line-clamp-2 font-display text-base leading-snug sm:text-lg">
          <Link href={href} className="transition-colors hover:text-[var(--hp-navy)]">{property.title}</Link>
        </h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{property.parish}, {property.municipality}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2.5 text-xs text-muted-foreground sm:text-sm">
          {property.typology && <span className="font-medium text-foreground">{property.typology}</span>}
          <span className="flex items-center gap-1"><BedDouble className="size-4" /> {property.beds}</span>
          <span className="flex items-center gap-1"><Bath className="size-4" /> {property.baths}</span>
          <span className="flex items-center gap-1"><Maximize2 className="size-4" /> {formatArea(property.area)}</span>
        </div>
        <span className="text-[0.7rem] text-muted-foreground">Ref. {property.reference}</span>
      </div>
    </article>
  );
}

export function FeaturedProperties({ properties }: { properties: Property[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  const onScroll = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    children.forEach((c, i) => {
      const cc = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  }, []);

  function goTo(i: number) {
    const el = scrollerRef.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (el && child) el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }

  if (properties.length === 0) return null;

  return (
    <section aria-labelledby="featured-title" className="overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="hp-eyebrow">Seleção HousePro</p>
        <h2 id="featured-title" className="mt-1 font-display text-2xl sm:text-3xl">
          Casas com história para começar a sua
        </h2>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {properties.map((p, i) => (
          <div
            key={p.id}
            className="w-[88%] shrink-0 snap-start sm:w-[62%] lg:w-[46%]"
            style={i === properties.length - 1 ? { marginRight: "max(0px, calc((100vw - 72rem) / 2))" } : undefined}
          >
            <FeaturedCard property={p} />
          </div>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2" role="tablist" aria-label="Escolher imóvel">
          {properties.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Imóvel ${i + 1}`}
              onClick={() => goTo(i)}
              className="h-2 rounded-full transition-all"
              style={{ width: i === active ? 22 : 8, background: i === active ? "var(--hp-red)" : "var(--border)" }}
            />
          ))}
        </div>
        <Link href="/imoveis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70">
          Ver todos os imóveis <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
