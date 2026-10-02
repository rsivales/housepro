"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

import { track } from "@/lib/analytics";

/**
 * Galeria em ecrã inteiro (lightbox) — reutilizada pelo hero e pela galeria
 * editorial. Suporta: teclado (setas, Esc), swipe no telemóvel, arrastar no
 * desktop, zoom, tiras de miniaturas e devolução de foco ao fechar.
 *
 * Controlada pelo componente-pai: `index` = null significa fechada.
 */
export function PropertyLightbox({
  images,
  title,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[];
  title: string;
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const open = index !== null;
  const i = index ?? 0;
  const [zoom, setZoom] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const restoreFocus = React.useRef<HTMLElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const go = React.useCallback(
    (dir: number) => {
      if (!images.length) return;
      const nextI = (i + dir + images.length) % images.length;
      onIndexChange(nextI);
      setZoom(false);
      track("pdp_gallery_next");
    },
    [i, images.length, onIndexChange]
  );

  // Teclado + bloqueio de scroll do body + gestão de foco.
  React.useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocus.current?.focus?.();
    };
  }, [open, go, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galeria — ${title}`}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium tabular-nums">
          {i + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            aria-label={zoom ? "Reduzir" : "Ampliar"}
            className="grid size-10 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar galeria"
            className="grid size-10 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Palco */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Foto anterior"
            className="absolute left-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[i]}
          alt={`${title} — fotografia ${i + 1}`}
          onClick={() => setZoom((z) => !z)}
          className={
            "max-h-full max-w-full select-none object-contain transition-transform duration-200 " +
            (zoom ? "scale-150 cursor-zoom-out" : "cursor-zoom-in")
          }
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Foto seguinte"
            className="absolute right-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, idx) => (
            <button
              key={src + idx}
              type="button"
              onClick={() => {
                onIndexChange(idx);
                setZoom(false);
              }}
              aria-label={`Ver fotografia ${idx + 1}`}
              aria-current={idx === i}
              className={
                "h-14 w-20 shrink-0 overflow-hidden rounded-md transition " +
                (idx === i ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")
              }
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
