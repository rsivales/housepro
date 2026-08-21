"use client";

import * as React from "react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { publishedStories, type Story } from "@/lib/data/stories";
import { readStories } from "@/lib/data/site-content";
import { track } from "@/lib/analytics";

/**
 * Testemunhos em vídeo (9:16). Secção OCULTA enquanto não existirem testemunhos
 * reais publicados com consentimento (geridos no admin) — nunca fabricar
 * clientes/nomes/frases. Sem autoplay; vídeo carrega só após interação.
 */
export function ValuationTestimonials() {
  const [stories, setStories] = React.useState<Story[]>([]);

  React.useEffect(() => {
    setStories(publishedStories(readStories()));
  }, []);

  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="testemunhos" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="hp-eyebrow">Testemunhos</p>
      <h2 id="testemunhos" className="mt-1 font-display text-2xl sm:text-3xl">Quem vendeu connosco conta melhor.</h2>
      <p className="mt-2 text-sm text-muted-foreground">Experiências reais de proprietários acompanhados pela HousePro.</p>

      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {stories.map((s) => (
          <div key={s.id} className="w-[78%] shrink-0 snap-start sm:w-auto" onPointerDown={() => track("valuation_testimonial_play")}>
            <VideoTestimonial t={s} />
          </div>
        ))}
      </div>
    </section>
  );
}
