"use client";

import * as React from "react";
import {
  BedDouble,
  CalendarDays,
  Car,
  ChevronUp,
  Images,
  Maximize2,
  MapPin,
  Ruler,
  Trees,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";
import { FavoriteButton } from "@/components/property/favorite-button";
import { PropertyLightbox } from "@/components/property/property-lightbox";
import { HeroShareButton } from "@/components/property/hero-share-button";

const ICONS: Record<string, React.ElementType> = {
  beds: BedDouble,
  areaUtil: Maximize2,
  areaDependente: Ruler,
  land: Trees,
  garage: Car,
  elevator: ChevronUp,
  year: CalendarDays,
  baths: BedDouble,
  location: MapPin,
};

export interface HeroStat {
  key: string;
  label: string;
  value: string;
}

/**
 * Hero imersivo da página de imóvel: fotografia de grande formato com título,
 * localização, preço e faixa deslizável de características por cima. Abre a
 * galeria em ecrã inteiro. A imagem é o principal elemento de venda (LCP).
 */
export function PropertyHero({
  images,
  title,
  parish,
  municipality,
  price,
  status,
  operation,
  stats,
  propertyId,
  objectPosition = "center",
}: {
  images: string[];
  title: string;
  parish: string;
  municipality: string;
  price: string;
  status?: PropertyStatus | null;
  operation: string;
  stats: HeroStat[];
  propertyId: string;
  objectPosition?: string;
}) {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; scroll: number } | null>(null);
  const cover = images[0] ?? "";

  const openGallery = () => {
    setLightbox(0);
    track("pdp_gallery_open");
  };

  // Arrastar com o rato a faixa de características (desktop).
  const onPointerDown = (e: React.PointerEvent) => {
    if (!railRef.current) return;
    drag.current = { x: e.clientX, scroll: railRef.current.scrollLeft };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !railRef.current) return;
    railRef.current.scrollLeft = drag.current.scroll - (e.clientX - drag.current.x);
  };
  const endDrag = () => (drag.current = null);

  return (
    <section className="relative">
      <div className="relative overflow-hidden rounded-b-3xl sm:rounded-3xl">
        {/* Imagem de capa (LCP) */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            fetchPriority="high"
            className="h-[62vh] max-h-[640px] min-h-[420px] w-full object-cover sm:h-[68vh]"
            style={{ objectPosition }}
          />
        ) : (
          <div className="grid h-[60vh] min-h-[420px] w-full place-items-center bg-[var(--hp-navy)] text-white/70">
            <span className="flex items-center gap-2 text-sm"><Images className="size-5" /> Sem fotografias</span>
          </div>
        )}

        {/* Gradiente para legibilidade */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/25" />

        {/* Etiquetas de estado + operação */}
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 sm:left-6 sm:top-6">
          {status && (
            <span className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm", STATUS_STYLE[status])}>
              {STATUS_LABEL[status]}
            </span>
          )}
          <span className="rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-semibold capitalize text-[var(--hp-navy)] shadow-sm backdrop-blur">
            {operation}
          </span>
        </div>

        {/* Ações + contador */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
          <HeroShareButton title={title} />
          <div className="rounded-full bg-black/35 p-0.5 backdrop-blur">
            <FavoriteButton propertyId={propertyId} variant="icon-light" onToggle={() => track("pdp_favorite")} />
          </div>
        </div>

        {images.length > 0 && (
          <button
            type="button"
            onClick={openGallery}
            className="absolute right-4 top-16 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60 sm:right-6 sm:top-20"
          >
            <Images className="size-3.5" /> {1} / {images.length}
          </button>
        )}

        {/* Conteúdo sobreposto */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:px-6 sm:pb-6">
          <h1 className="max-w-3xl font-display text-3xl font-semibold leading-[1.05] text-white drop-shadow-sm sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
            <MapPin className="size-4 shrink-0" /> {parish}, {municipality}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{price}</p>

          {/* Faixa deslizável de características */}
          {stats.length > 0 && (
            <div className="relative mt-4">
              <div
                ref={railRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
                aria-label="Características do imóvel"
              >
                {stats.map((s) => {
                  const Icon = ICONS[s.key] ?? MapPin;
                  return (
                    <span
                      key={s.key}
                      role="listitem"
                      title={s.label}
                      className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md"
                    >
                      <Icon className="size-4 opacity-90" /> {s.value}
                    </span>
                  );
                })}
              </div>
              {/* Pista de que há mais conteúdo à direita */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/60 to-transparent" />
            </div>
          )}
        </div>
      </div>

      <PropertyLightbox
        images={images}
        title={title}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </section>
  );
}
