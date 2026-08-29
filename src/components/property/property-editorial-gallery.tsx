"use client";

import * as React from "react";
import { Images, Play, LayoutPanelTop, ChevronRight, Box } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { PropertyLightbox } from "@/components/property/property-lightbox";

type Tab = "fotos" | "video" | "plantas";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/**
 * Galeria editorial "Descubra cada detalhe": composição assimétrica (1 grande +
 * 2 secundárias), separadores Fotografias / Vídeo·360º / Plantas (só aparecem
 * quando há conteúdo) e abertura em ecrã inteiro. Vídeo e tour carregam apenas
 * após interação (performance e privacidade).
 */
export function PropertyEditorialGallery({
  images,
  plans,
  videoUrl,
  tourUrl,
  title,
}: {
  images: string[];
  plans?: string[];
  videoUrl?: string;
  tourUrl?: string;
  title: string;
}) {
  const [tab, setTab] = React.useState<Tab>("fotos");
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [planbox, setPlanbox] = React.useState<number | null>(null);
  const [playVideo, setPlayVideo] = React.useState(false);
  const [playTour, setPlayTour] = React.useState(false);

  const embed = videoUrl ? youtubeEmbed(videoUrl) : null;
  const hasVideo = Boolean(embed || tourUrl);
  const hasPlans = Boolean(plans && plans.length);

  const tabs: { key: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { key: "fotos", label: "Fotografias", icon: Images, show: images.length > 0 },
    { key: "video", label: "Vídeo / 360º", icon: Play, show: hasVideo },
    { key: "plantas", label: "Plantas", icon: LayoutPanelTop, show: hasPlans },
  ];
  const visible = tabs.filter((t) => t.show);

  if (images.length === 0 && !hasVideo && !hasPlans) return null;

  const openPhoto = (i: number) => {
    setLightbox(i);
    track("pdp_gallery_open");
  };

  const big = images[0];
  const secondary = images.slice(1, 3);

  return (
    <section aria-labelledby="galeria-heading">
      <h2 id="galeria-heading" className="font-display text-2xl text-[var(--hp-navy)]">
        Descubra cada detalhe
      </h2>
      <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />

      {/* Composição assimétrica de fotografias */}
      {tab === "fotos" && images.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:grid-rows-2">
          <button
            type="button"
            onClick={() => openPhoto(0)}
            className="group relative overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2"
            aria-label="Abrir galeria de fotografias"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big} alt={`${title} — fotografia principal`} loading="lazy" className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-full" />
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <Images className="size-3.5" /> {images.length} fotografias
            </span>
          </button>
          {secondary.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => openPhoto(i + 1)}
              className="group relative hidden overflow-hidden rounded-2xl sm:block"
              aria-label={`Abrir fotografia ${i + 2}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} — fotografia ${i + 2}`} loading="lazy" className="h-full min-h-[7rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            </button>
          ))}
        </div>
      )}

      {/* Vídeo / 360º — carrega após interação */}
      {tab === "video" && (
        <div className="mt-6 space-y-4">
          {embed && (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              {playVideo ? (
                <iframe
                  src={`${embed}?autoplay=1&rel=0`}
                  title={`Vídeo — ${title}`}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button type="button" onClick={() => { setPlayVideo(true); track("pdp_video_play"); }} className="group grid size-full place-items-center bg-[var(--hp-navy)] text-white" aria-label="Reproduzir vídeo">
                  <span className="flex flex-col items-center gap-2">
                    <span className="grid size-16 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/25"><Play className="size-7 translate-x-0.5" /></span>
                    <span className="text-sm font-medium">Reproduzir vídeo</span>
                  </span>
                </button>
              )}
            </div>
          )}
          {tourUrl && (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              {playTour ? (
                <iframe src={tourUrl} title={`Tour 360º — ${title}`} className="size-full" allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
              ) : (
                <button type="button" onClick={() => { setPlayTour(true); track("pdp_video_play"); }} className="group grid size-full place-items-center bg-[var(--hp-navy)] text-white" aria-label="Abrir tour virtual">
                  <span className="flex flex-col items-center gap-2">
                    <span className="grid size-16 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/25"><Box className="size-7" /></span>
                    <span className="text-sm font-medium">Abrir tour virtual 360º</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plantas */}
      {tab === "plantas" && hasPlans && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {plans!.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => { setPlanbox(i); track("pdp_plans_open"); }}
              className="overflow-hidden rounded-2xl border bg-white p-2"
              aria-label={`Abrir planta ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Planta ${i + 1}`} loading="lazy" className="h-56 w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* Separadores + abrir galeria */}
      {visible.length > 1 && (
        <div className="mt-5 flex flex-wrap items-center gap-1 border-b">
          {visible.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-[var(--hp-red)] text-[var(--hp-navy)]"
                  : "border-transparent text-[var(--hp-text-2)] hover:text-[var(--hp-navy)]"
              )}
            >
              <t.icon className={cn("size-4", tab === t.key && "text-[var(--hp-red)]")} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <button
          type="button"
          onClick={() => openPhoto(0)}
          className="mt-5 flex w-full items-center justify-between rounded-xl border px-5 py-3.5 text-sm font-medium text-[var(--hp-navy)] transition-colors hover:bg-black/[0.03]"
        >
          Ver galeria completa
          <ChevronRight className="size-4" />
        </button>
      )}

      <PropertyLightbox images={images} title={title} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
      {hasPlans && (
        <PropertyLightbox images={plans!} title={`Plantas — ${title}`} index={planbox} onClose={() => setPlanbox(null)} onIndexChange={setPlanbox} />
      )}
    </section>
  );
}
