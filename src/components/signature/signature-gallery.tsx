"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { PropertyLightbox } from "@/components/property/property-lightbox";
import { SignatureImage } from "./signature-image";

export function SignatureGallery({ images, title, children }: { images: string[]; title: string; children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const go = (direction: number) => setActive(i => (i + direction + images.length) % images.length);

  return <div>
    <div className="relative isolate min-h-[610px] overflow-hidden bg-[#101b2b] sm:min-h-[700px] lg:min-h-[min(850px,85vh)]">
      <SignatureImage sources={[images[active], ...images].filter(Boolean)} alt={title} priority sizes="100vw" className="object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,16,29,.92)_0%,rgba(6,16,29,.69)_39%,rgba(6,16,29,.13)_76%),linear-gradient(0deg,rgba(6,16,29,.65),transparent_38%)]" />
      <div className="relative z-10 mx-auto flex min-h-[610px] max-w-[1500px] flex-col justify-between px-5 pb-7 pt-20 sm:min-h-[700px] sm:px-10 sm:pb-10 lg:min-h-[min(850px,85vh)] lg:pt-28">
        {children}
        <div className="flex items-end justify-between gap-4">
          <a href="#experiencia" className="hidden items-center gap-2 text-xs tracking-[.12em] text-white/75 hover:text-white sm:inline-flex">DESCOBRIR <ArrowDown className="size-4" /></a>
          {images.length > 0 && <div className="ml-auto flex items-center gap-2">
            {images.length > 1 && <><button type="button" onClick={() => go(-1)} aria-label="Fotografia anterior" className="grid size-11 place-items-center border border-white/45 bg-[#101b2b]/45 text-white backdrop-blur-sm hover:bg-[#101b2b]/80"><ChevronLeft className="size-5" /></button><button type="button" onClick={() => go(1)} aria-label="Fotografia seguinte" className="grid size-11 place-items-center border border-white/45 bg-[#101b2b]/45 text-white backdrop-blur-sm hover:bg-[#101b2b]/80"><ChevronRight className="size-5" /></button></>}
            <button type="button" onClick={() => setLightbox(active)} className="inline-flex min-h-11 items-center gap-2 border border-white/45 bg-[#101b2b]/55 px-3 text-xs text-white backdrop-blur-sm hover:bg-[#101b2b]/90 sm:px-4"><Expand className="size-4" /> <span className="hidden sm:inline">Ver galeria</span> {active + 1} / {images.length}</button>
          </div>}
        </div>
      </div>
    </div>
    <PropertyLightbox images={images} title={title} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
  </div>;
}
