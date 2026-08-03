"use client";

import { Box } from "lucide-react";

import type { Property } from "@/lib/data/types";
import { BeforeAfter } from "./before-after";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/**
 * Secção de multimédia — só aparece quando o imóvel TEM mesmo estes elementos
 * (vídeo, tour 3D ou pares antes/depois). Nada de demonstrações automáticas.
 */
export function PropertyMedia({ property }: { property: Property }) {
  const embed = property.videoUrl ? youtubeEmbed(property.videoUrl) : null;
  const pairs =
    property.beforeAfter && property.beforeAfter.length ? property.beforeAfter : [];

  if (!embed && !property.tourUrl && pairs.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-xl">Multimédia</h2>
      <div className="mt-4 space-y-5">
        {embed && (
          <div className="aspect-video w-full overflow-hidden rounded-2xl border">
            <iframe
              src={embed}
              title="Vídeo do imóvel"
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {property.tourUrl && (
          <div className="space-y-2">
            <div className="aspect-video w-full overflow-hidden rounded-2xl border">
              <iframe
                src={property.tourUrl}
                title="Tour virtual 3D"
                className="size-full"
                allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
                allowFullScreen
              />
            </div>
            <a
              href={property.tourUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Box className="size-4" /> Abrir tour em ecrã inteiro
            </a>
          </div>
        )}

        {pairs.map((pa, i) => (
          <BeforeAfter key={i} before={pa.before} after={pa.after} label={pa.label} />
        ))}
      </div>
    </section>
  );
}
