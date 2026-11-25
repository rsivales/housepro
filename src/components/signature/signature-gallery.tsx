"use client";

import { useRef, useState } from "react";
import { Expand } from "lucide-react";
import { PropertyLightbox } from "@/components/property/property-lightbox";
import { SignatureImage } from "./signature-image";

export function SignatureGallery({ images, title }: { images: string[]; title: string }) {
  const [lightbox, setLightbox] = useState<number | null>(images.length ? 0 : null);
  const galleryButton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="relative aspect-[4/3] max-h-[76svh] overflow-hidden bg-[#101b2b] sm:aspect-[16/9]">
        <SignatureImage sources={images} alt={title} priority sizes="100vw" className="object-cover" />
        {images.length > 0 && (
          <button
            ref={galleryButton}
            type="button"
            onClick={() => setLightbox(0)}
            className="absolute inset-0 flex items-end justify-end p-4 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:p-8"
          >
            <span className="inline-flex min-h-11 items-center gap-2 bg-[#0a1422]/90 px-4 text-sm text-white">
              <Expand className="size-4" aria-hidden="true" />
              Ver fotografias ({images.length})
            </span>
          </button>
        )}
      </div>
      <PropertyLightbox
        images={images}
        title={title}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        detailsId="detalhes-imovel"
        returnFocusRef={galleryButton}
      />
    </>
  );
}
