import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { STORIES } from "@/lib/data/stories";

/**
 * "Histórias reais" — a nossa melhor prova são as pessoas. Testemunho em vídeo
 * (sem autoplay) à esquerda + duas fotografias reais à direita. Privacidade:
 * sem documentos, valores não autorizados, moradas completas ou rostos sem
 * consentimento. Histórias completas em /historias-reais.
 */
export function RealStories() {
  const featured = STORIES[0];
  const gallery = STORIES.filter((s) => s.poster).slice(0, 2);

  return (
    <section aria-labelledby="stories-title" className="mx-auto max-w-6xl px-4 sm:px-6">
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

        {/* Duas fotografias reais (ou fallback Deep Navy) */}
        <div className="grid grid-rows-2 gap-4">
          {[0, 1].map((i) => {
            const photo = gallery[i]?.poster;
            return (
              <div key={i} className="relative overflow-hidden rounded-3xl border bg-card">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Momento de um cliente HousePro" className="absolute inset-0 size-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0" style={{ background: i === 0 ? "linear-gradient(120deg, #2b5476, #0B1F3A)" : "linear-gradient(120deg, #0B1F3A, #244765)" }} aria-hidden />
                )}
                <div className="relative min-h-[130px]" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
