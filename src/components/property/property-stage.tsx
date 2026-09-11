"use client";

import * as React from "react";
import {
  BedDouble,
  Box,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Images,
  LayoutPanelTop,
  Maximize2,
  MapPin,
  MoveHorizontal,
  Play,
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
import { BeforeAfter } from "@/components/property/before-after";

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

type BAPair = { before: string; after: string; label?: string };
type Mode = "photo" | "video" | "tour" | "ba" | "plans";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/**
 * Palco de media ÚNICO da página de imóvel: num só ecrã reúne fotografias
 * (deslizar com o dedo + miniaturas + contador), vídeo, tour virtual 360º,
 * antes/depois e plantas. Os ícones de media e a informação (área, preço,
 * estado) ficam sobrepostos na própria foto de destaque — sem segundo ecrã.
 */
export function PropertyStage({
  images,
  plans,
  videoUrl,
  tourUrl,
  beforeAfter,
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
  plans?: string[];
  videoUrl?: string;
  tourUrl?: string;
  beforeAfter?: BAPair[];
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
  const [mode, setMode] = React.useState<Mode>("photo");
  const [photoIndex, setPhotoIndex] = React.useState(0);
  const [baIndex, setBaIndex] = React.useState(0);
  const [planIndex, setPlanIndex] = React.useState(0);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [planbox, setPlanbox] = React.useState<number | null>(null);
  const touchX = React.useRef<number | null>(null);

  const embed = videoUrl ? youtubeEmbed(videoUrl) : null;
  const baPairs = (beforeAfter ?? []).filter((p) => p.before && p.after);
  const planList = plans ?? [];
  const hasVideo = Boolean(embed);
  const hasTour = Boolean(tourUrl);
  const hasBA = baPairs.length > 0;
  const hasPlans = planList.length > 0;
  const n = images.length;

  const go = React.useCallback(
    (dir: number) => {
      if (!n) return;
      setMode("photo");
      setPhotoIndex((i) => (i + dir + n) % n);
      track("pdp_gallery_next");
    },
    [n]
  );

  // Deslizar (telemóvel) sobre a foto para mudar de fotografia.
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || mode !== "photo") return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const cover = images[photoIndex] ?? images[0] ?? "";

  // Botões de media sobrepostos (só os que têm conteúdo).
  const mediaButtons: { mode: Mode; icon: React.ElementType; label: string; show: boolean }[] = [
    { mode: "photo", icon: Images, label: "Fotografias", show: n > 0 },
    { mode: "video", icon: Play, label: "Vídeo", show: hasVideo },
    { mode: "tour", icon: Box, label: "Tour 360º", show: hasTour },
    { mode: "ba", icon: MoveHorizontal, label: "Antes / depois", show: hasBA },
    { mode: "plans", icon: LayoutPanelTop, label: "Plantas", show: hasPlans },
  ];
  const switchable = mediaButtons.filter((b) => b.show);
  const showSwitcher = switchable.length > 1;

  function selectMode(m: Mode) {
    setMode(m);
    if (m === "video" || m === "tour") track("pdp_video_play");
    if (m === "plans") track("pdp_plans_open");
  }

  return (
    <section className="relative">
      <div className="relative overflow-hidden rounded-b-3xl bg-[var(--hp-navy)] sm:rounded-3xl">
        {/* Palco (altura fixa) */}
        <div
          className="relative h-[62vh] max-h-[640px] min-h-[420px] w-full sm:h-[68vh]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* FOTOGRAFIAS */}
          {mode === "photo" &&
            (cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={title}
                fetchPriority="high"
                className="size-full object-cover"
                style={{ objectPosition }}
              />
            ) : (
              <div className="grid size-full place-items-center text-white/70">
                <span className="flex items-center gap-2 text-sm"><Images className="size-5" /> Sem fotografias</span>
              </div>
            ))}

          {/* VÍDEO — reproduz automaticamente */}
          {mode === "video" && embed && (
            <iframe
              src={`${embed}?autoplay=1&rel=0`}
              title={`Vídeo — ${title}`}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* TOUR VIRTUAL 360º */}
          {mode === "tour" && tourUrl && (
            <iframe
              src={tourUrl}
              title={`Tour 360º — ${title}`}
              className="size-full"
              allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
              allowFullScreen
            />
          )}

          {/* ANTES / DEPOIS */}
          {mode === "ba" && hasBA && (
            <div className="grid size-full place-items-center bg-black p-3">
              <div className="w-full max-w-3xl">
                <BeforeAfter
                  before={baPairs[baIndex].before}
                  after={baPairs[baIndex].after}
                  label={baPairs[baIndex].label}
                />
                {baPairs.length > 1 && (
                  <div className="mt-3 flex justify-center gap-1.5">
                    {baPairs.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setBaIndex(i)}
                        aria-label={`Par ${i + 1}`}
                        className={cn("h-1.5 rounded-full transition-all", i === baIndex ? "w-6 bg-white" : "w-1.5 bg-white/40")}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLANTAS */}
          {mode === "plans" && hasPlans && (
            <button
              type="button"
              onClick={() => setPlanbox(planIndex)}
              className="grid size-full place-items-center bg-white"
              aria-label="Ampliar planta"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={planList[planIndex]} alt={`Planta ${planIndex + 1}`} className="max-h-full max-w-full object-contain p-3" />
            </button>
          )}

          {/* Gradiente (só no modo fotografia, para legibilidade do texto) */}
          {mode === "photo" && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
          )}

          {/* Etiquetas: estado + operação (foto) OU voltar (outros modos) */}
          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
            {mode === "photo" ? (
              <>
                {status && (
                  <span className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm", STATUS_STYLE[status])}>
                    {STATUS_LABEL[status]}
                  </span>
                )}
                <span className="rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-semibold capitalize text-[var(--hp-navy)] shadow-sm backdrop-blur">
                  {operation}
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode("photo")}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[var(--hp-navy)] shadow-sm backdrop-blur transition hover:bg-white"
              >
                <ChevronLeft className="size-3.5" /> Fotografias
              </button>
            )}
          </div>

          {/* Ações + contador */}
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
            <HeroShareButton title={title} />
            <div className="rounded-full bg-black/35 p-0.5 backdrop-blur">
              <FavoriteButton propertyId={propertyId} variant="icon-light" onToggle={() => track("pdp_favorite")} />
            </div>
          </div>
          {mode === "photo" && n > 0 && (
            <button
              type="button"
              onClick={() => { setLightbox(photoIndex); track("pdp_gallery_open"); }}
              className="absolute right-4 top-16 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/65 sm:right-6 sm:top-20"
            >
              <Maximize2 className="size-3.5" /> {photoIndex + 1} / {n}
            </button>
          )}

          {/* Comutador de media sobreposto (ícones na própria foto) */}
          {showSwitcher && (
            <div className="absolute left-4 top-16 z-10 flex max-w-[70%] flex-wrap gap-1.5 sm:left-6 sm:top-20">
              {switchable.map((b) => {
                if (b.mode === "photo" && mode === "photo") return null; // já estamos nas fotos
                const active = b.mode === mode;
                const Icon = b.icon;
                return (
                  <button
                    key={b.mode}
                    type="button"
                    onClick={() => selectMode(b.mode)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition",
                      active ? "bg-white text-[var(--hp-navy)]" : "bg-black/45 text-white hover:bg-black/65"
                    )}
                  >
                    <Icon className="size-3.5" /> {b.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Setas de navegação de fotos (desktop/telemóvel) */}
          {mode === "photo" && n > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 sm:left-4"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Foto seguinte"
                className="absolute right-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 sm:right-4"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Plantas: setas quando há mais do que uma */}
          {mode === "plans" && planList.length > 1 && (
            <>
              <button type="button" onClick={() => setPlanIndex((i) => (i - 1 + planList.length) % planList.length)} aria-label="Planta anterior" className="absolute left-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white transition hover:bg-black/55 sm:left-4">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => setPlanIndex((i) => (i + 1) % planList.length)} aria-label="Planta seguinte" className="absolute right-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white transition hover:bg-black/55 sm:right-4">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Conteúdo sobreposto (título, localização, preço, características) */}
          {mode === "photo" && (
            <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:px-6 sm:pb-6">
              <h1 className="max-w-3xl font-display text-3xl font-semibold leading-[1.05] text-white drop-shadow-sm sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
                <MapPin className="size-4 shrink-0" /> {parish}, {municipality}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{price}</p>

              {stats.length > 0 && (
                <div className="relative mt-4">
                  <div
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/60 to-transparent" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Miniaturas por baixo — navegação de fotografias */}
        {n > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-[var(--hp-navy)] px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((src, idx) => (
              <button
                key={src + idx}
                type="button"
                onClick={() => { setMode("photo"); setPhotoIndex(idx); }}
                aria-label={`Ver fotografia ${idx + 1}`}
                aria-current={mode === "photo" && idx === photoIndex}
                className={cn(
                  "h-14 w-20 shrink-0 overflow-hidden rounded-md transition sm:h-16 sm:w-24",
                  mode === "photo" && idx === photoIndex ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ecrã inteiro (fotografias e plantas) */}
      <PropertyLightbox images={images} title={title} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
      {hasPlans && (
        <PropertyLightbox images={planList} title={`Plantas — ${title}`} index={planbox} onClose={() => setPlanbox(null)} onIndexChange={setPlanbox} />
      )}
    </section>
  );
}
