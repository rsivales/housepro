"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { PropertyLightbox } from "@/components/property/property-lightbox";
import { SignatureImage } from "./signature-image";

export function SignatureGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const go = (direction: number) => setActive(i => (i + direction + images.length) % images.length);
  return <div className="min-w-0 w-full">
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#172330] sm:aspect-[16/9]">
      <SignatureImage sources={[images[active], ...images].filter(Boolean)} alt={title} priority sizes="(min-width: 1280px) 1216px, 100vw" className="object-cover" />
      {images.length > 0 && <button onClick={() => setLightbox(active)} aria-label="Abrir fotografias em ecrã inteiro" className="absolute bottom-4 right-4 flex min-h-11 items-center gap-2 bg-black/60 px-4 text-xs text-white"><Expand className="size-4"/> Ver fotografias · {active + 1}/{images.length}</button>}
      {images.length > 1 && <><button onClick={() => go(-1)} aria-label="Fotografia anterior" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronLeft/></button><button onClick={() => go(1)} aria-label="Fotografia seguinte" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronRight/></button></>}
    </div>
    {images.length > 1 && <div className="mt-3 flex w-full min-w-0 gap-2 overflow-x-auto pb-2" aria-label="Miniaturas da propriedade">{images.map((src, i) => <button key={src} onClick={() => setActive(i)} aria-label={`Ver fotografia ${i + 1}`} aria-pressed={active === i} className={`relative h-16 w-24 shrink-0 overflow-hidden border-2 ${active === i ? "border-[#9c7e48]" : "border-transparent"}`}><SignatureImage sources={[src]} alt="" sizes="96px" className="object-cover"/></button>)}</div>}
    <PropertyLightbox images={images} title={title} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox}/>
  </div>;
}
