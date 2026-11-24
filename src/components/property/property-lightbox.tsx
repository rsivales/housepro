"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

import { track } from "@/lib/analytics";

/**
 * Galeria em ecrã inteiro (lightbox) — reutilizada pelo hero e pela galeria
 * editorial. Suporta: teclado (setas, Esc), swipe no telemóvel, zoom,
 * miniaturas e devolução de foco ao fechar.
 *
 * Controlada pelo componente-pai: `index` = null significa fechada.
 */
export function PropertyLightbox({
  images,
  title,
  index,
  onClose,
  onIndexChange,
  detailsId,
  returnFocusRef,
}: {
  images: string[];
  title: string;
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  detailsId?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const open = index !== null;
  const i = index ?? 0;
  const [zoom, setZoom] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const restoreFocus = React.useRef<HTMLElement | null>(null);
  const viewDetails = React.useRef(false);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const go = React.useCallback(
    (dir: number) => {
      if (images.length < 2) return;
      const nextI = (i + dir + images.length) % images.length;
      onIndexChange(nextI);
      setZoom(false);
      track("pdp_gallery_next");
    },
    [i, images.length, onIndexChange]
  );

  function close() {
    setZoom(false);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[70] flex h-dvh flex-col bg-black outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const details = viewDetails.current && detailsId ? document.getElementById(detailsId) : null;
            viewDetails.current = false;
            if (details) {
              details.focus({ preventScroll: true });
              details.scrollIntoView({ block: "start" });
            } else {
              (returnFocusRef?.current ?? restoreFocus.current)?.focus({ preventScroll: true });
            }
          }}
          onKeyDown={(event) => {
            if (images.length < 2) return;
            if (event.key === "ArrowRight") go(1);
            else if (event.key === "ArrowLeft") go(-1);
          }}
        >
          <Dialog.Title className="sr-only">Galeria — {title}</Dialog.Title>
          {/* Barra superior */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] text-white">
            <span className="whitespace-nowrap text-sm font-medium tabular-nums" aria-live="polite">
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
                onClick={() => {
                  viewDetails.current = Boolean(detailsId);
                  close();
                }}
                aria-label={detailsId ? "Ver detalhes do imóvel" : "Fechar galeria"}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm text-white transition hover:bg-white/15"
              >
                {detailsId && <span>Ver detalhes</span>}
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Palco */}
          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden"
            onTouchCancel={() => { touchStartX.current = null; }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
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
                className="absolute left-2 z-10 grid size-11 place-items-center rounded-full bg-black/65 text-white transition hover:bg-black/85 sm:left-4"
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
                "size-full select-none object-contain transition-transform duration-200 " +
                (zoom ? "scale-150 cursor-zoom-out" : "cursor-zoom-in")
              }
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Foto seguinte"
                className="absolute right-2 z-10 grid size-11 place-items-center rounded-full bg-black/65 text-white transition hover:bg-black/85 sm:right-4"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Miniaturas */}
          {images.length > 1 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
