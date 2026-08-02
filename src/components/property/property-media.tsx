"use client";

import { Box } from "lucide-react";

import type { Property } from "@/lib/data/types";
import { BeforeAfter } from "./before-after";

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// Demonstração garantida enquanto o upload de antes/depois não é preenchido.
const DEMO_PAIR = {
  before: "/properties/casapt-wc.jpg",
  after: "/properties/casapt-aerial.jpg",
  label: "Exemplo — arraste para ver o antes/depois (virtual staging / obras)",
};

export function PropertyMedia({ property }: { property: Property }) {
  const embed = property.videoUrl ? youtubeEmbed(property.videoUrl) : null;

  const pairs =
    property.beforeAfter && property.beforeAfter.length
      ? property.beforeAfter
      : property.gallery && property.gallery.length >= 2
        ? [
            {
              before: property.gallery[0],
              after: property.gallery[1],
              label: DEMO_PAIR.label,
            },
          ]
        : [DEMO_PAIR];

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
          <a
            href={property.tourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <Box className="size-4" /> Tour virtual 3D
          </a>
        )}

        {pairs.map((pa, i) => (
          <BeforeAfter key={i} before={pa.before} after={pa.after} label={pa.label} />
        ))}
      </div>
    </section>
  );
}
