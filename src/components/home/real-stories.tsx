import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { VideoTestimonial, type Testimonial } from "@/components/home/video-testimonial";

/**
 * "Histórias reais" — a nossa melhor prova são as pessoas. Testemunho em
 * vídeo (sem autoplay), citação, nome e localidade. Sem dados sensíveis
 * (documentos, moradas completas, valores não autorizados, rostos sem
 * consentimento). Histórias completas em /historias-reais.
 */
const FEATURED: Testimonial = {
  quote: "Sentimo-nos acompanhados do primeiro contacto à escritura.",
  name: "Ana e Miguel",
  locality: "Faro",
  operation: "Compra",
};

export function RealStories() {
  return (
    <section aria-labelledby="stories-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hp-eyebrow">Histórias reais</p>
          <h2 id="stories-title" className="mt-1 font-display text-2xl sm:text-3xl">
            A nossa melhor prova são as pessoas
          </h2>
        </div>
        <Link
          href="/historias-reais"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70"
        >
          Ver todas as histórias <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6">
        <VideoTestimonial t={FEATURED} />
      </div>
    </section>
  );
}
