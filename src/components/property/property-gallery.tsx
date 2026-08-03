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
  ChevronLeft,
  ChevronRight,
  Play,
  Box,
  Contrast,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";
import { BeforeAfter } from "./before-after";

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

type BAPair = { before: string; after: string; label?: string };
type View = "photo" | "video" | "tour" | "ba";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function PropertyGallery({
  images,
  title,
  status,
  operation,
  stats,
  videoUrl,
  tourUrl,
  beforeAfter,
}: {
  images: string[];
  title: string;
  status?: PropertyStatus | null;
  operation: string;
  stats: GalleryStat[];
  videoUrl?: string;
  tourUrl?: string;
  beforeAfter?: BAPair[];
}) {
  const [active, setActive] = React.useState(0);
  const [view, setView] = React.useState<View>("photo");

  const embed = videoUrl ? youtubeEmbed(videoUrl) : null;
  const hasBA = Boolean(beforeAfter && beforeAfter.length);
  const cover = images[active] ?? images[0] ?? "";

  const prev = () => setActive((a) => (a - 1 + images.length) % images.length);
  const next = () => setActive((a) => (a + 1) % images.length);

  const CloseBtn = (
    <button
      type="button"
      onClick={() => setView("photo")}
      aria-label="Voltar às fotos"
      className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
    >
      <X className="size-4" />
    </button>
  );

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border bg-black/5">
        {view === "photo" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={title} className="aspect-[16/10] w-full object-cover" />

            {/* Setas laterais discretas */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Foto seguinte"
                  className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                  {active + 1} / {images.length}
                </span>
              </>
            )}

            {/* Etiquetas (estado + operação) */}
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              {status && (
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur", STATUS_STYLE[status])}>
                  {STATUS_LABEL[status]}
                </span>
              )}
              <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium capitalize text-foreground shadow-sm backdrop-blur">
                {operation}
              </span>
            </div>

            {/* Botões de multimédia (semi-transparentes) */}
            {(embed || tourUrl || hasBA) && (
              <div className="absolute bottom-14 right-3 z-10 flex flex-col items-end gap-2">
                {embed && (
                  <MediaBtn onClick={() => setView("video")} icon={Play} label="Vídeo" />
                )}
                {tourUrl && (
                  <MediaBtn onClick={() => setView("tour")} icon={Box} label="Tour 360°" />
                )}
                {hasBA && (
                  <MediaBtn onClick={() => setView("ba")} icon={Contrast} label="Antes / depois" />
                )}
              </div>
            )}

            {/* Ícones embutidos na foto (características) */}
            {stats.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 z-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-10">
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
          </>
        )}

        {view === "video" && embed && (
          <div className="aspect-[16/10] w-full">
            <iframe
              src={`${embed}?autoplay=1&rel=0`}
              title="Vídeo do imóvel"
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {CloseBtn}
          </div>
        )}

        {view === "tour" && tourUrl && (
          <div className="aspect-[16/10] w-full">
            <iframe
              src={tourUrl}
              title="Tour virtual 360°"
              className="size-full"
              allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
              allowFullScreen
            />
            {CloseBtn}
          </div>
        )}

        {view === "ba" && hasBA && (
          <div className="relative">
            <BeforeAfter
              before={beforeAfter![0].before}
              after={beforeAfter![0].after}
              label={beforeAfter![0].label}
            />
            {CloseBtn}
          </div>
        )}
      </div>

      {/* Faixa de miniaturas (horizontal, com scroll) */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => {
                setActive(i);
                setView("photo");
              }}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-all",
                i === active && view === "photo"
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-75 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaBtn({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/75"
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}
