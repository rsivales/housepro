"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { publishedStories, type Story } from "@/lib/data/stories";
import { readStories } from "@/lib/data/site-content";

/**
 * "Histórias reais". Secção OCULTA enquanto não existirem histórias reais
 * publicadas com consentimento (geridas no admin). Nunca cartões vazios, nunca
 * fundos Navy a substituir fotografias de clientes, nunca nomes/testemunhos
 * fictícios. Quando existirem: vídeo (capa + play) + duas fotografias reais.
 */
export function RealStories() {
  const [stories, setStories] = React.useState<Story[]>([]);

  React.useEffect(() => {
    setStories(publishedStories(readStories()));
  }, []);

  if (stories.length === 0) return null;

  const featured = stories[0];
  const gallery = stories.slice(1, 3);

  return (
    <section aria-labelledby="stories-title" className="mx-auto mt-16 max-w-6xl px-4 sm:mt-24 sm:px-6">
      <p className="hp-eyebrow">Histórias reais</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h2 id="stories-title" className="font-display text-2xl sm:text-3xl">
          A nossa melhor prova são as pessoas.
        </h2>
        <Link href="/historias-reais" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70">
          Ver todas as histórias <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <VideoTestimonial t={featured} />
        <div className="grid grid-rows-2 gap-4">
          {gallery.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-3xl border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.poster} alt={`Cliente HousePro — ${s.name}`} className="absolute inset-0 size-full object-cover" loading="lazy" />
              <div className="relative min-h-[130px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
