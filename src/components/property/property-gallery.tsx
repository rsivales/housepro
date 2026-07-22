"use client";

import * as React from "react";
import {
  BedDouble,
  CalendarDays,
  Car,
  ChevronUp,
  Maximize2,
  MapPin,
  Ruler,
  Trees,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";

const ICONS: Record<string, React.ElementType> = {
  beds: BedDouble,
  areaUtil: Maximize2,
  areaDependente: Ruler,
  land: Trees,
  garage: Car,
  elevator: ChevronUp,
  year: CalendarDays,
  location: MapPin,
};

export interface GalleryStat {
  key: keyof typeof ICONS;
  label: string;
  value: string;
}

export function PropertyGallery({
  images,
  title,
  status,
  operation,
  stats,
}: {
  images: string[];
  title: string;
  status?: PropertyStatus | null;
  operation: string;
  stats: GalleryStat[];
}) {
  const [active, setActive] = React.useState(0);
  const cover = images[active] ?? images[0];

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={title}
          className="aspect-[16/10] w-full object-cover"
        />

        {/* Etiquetas (estado + operação) */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          {status && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur",
                STATUS_STYLE[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          )}
          <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium capitalize text-foreground shadow-sm backdrop-blur">
            {operation}
          </span>
        </div>

        {/* Ícones embutidos na foto */}
        {stats.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-10">
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.map((s) => {
                const Icon = ICONS[s.key] ?? MapPin;
                return (
                  <span
                    key={s.key}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm ring-1 ring-white/20"
                    title={s.label}
                  >
                    <Icon className="size-3.5" />
                    {s.value}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.slice(0, 10).map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "overflow-hidden rounded-lg border transition-all",
                i === active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-80 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
