"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import { VideoTestimonial } from "@/components/home/video-testimonial";
import { youTubeId, youTubePoster } from "@/lib/video";
import { publishedStories, type Story } from "@/lib/data/stories";
import { readStories, loadSiteContent } from "@/lib/data/site-content";

/**
 * "Histórias reais". Secção OCULTA enquanto não existirem histórias reais
 * publicadas com consentimento (geridas no admin). Nunca cartões vazios, nunca
 * fundos Navy a substituir fotografias de clientes, nunca nomes/testemunhos
 * fictícios. Quando existirem: vídeo em destaque + até duas outras histórias
 * clicáveis (capa + play); ao clicar passam para o leitor principal.
 */
export function RealStories() {
  const [stories, setStories] = React.useState<Story[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [autoStart, setAutoStart] = React.useState(false);

  React.useEffect(() => {
    loadSiteContent().then((c) => setStories(publishedStories(c.stories ?? readStories())));
  }, []);

  if (stories.length === 0) return null;

  const current = stories.find((s) => s.id === selected) ?? stories[0];
  const gallery = stories.filter((s) => s.id !== current.id).slice(0, 2);

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
        <VideoTestimonial key={current.id} t={current} autoStart={autoStart} />
        <div className="grid grid-rows-2 gap-4">
          {gallery.map((s) => {
            const ytId = youTubeId(s.videoSrc);
            const poster = s.poster || (ytId ? youTubePoster(ytId) : undefined);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s.id);
                  setAutoStart(Boolean(s.videoSrc));
                }}
                aria-label={s.videoSrc ? `Ver testemunho de ${s.name}` : `Ver história de ${s.name}`}
                className="group relative min-h-[150px] overflow-hidden rounded-2xl border bg-card text-left"
              >
                {poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-[rgba(11,31,58,0.75)] via-[rgba(11,31,58,0.15)] to-transparent" />
                {s.videoSrc && (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-12 place-items-center rounded-full bg-white/90 text-[var(--hp-navy)] shadow-lg transition-transform group-hover:scale-105">
                      <Play className="size-5 translate-x-0.5 fill-current" />
                    </span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-4 text-sm text-white">
                  <span className="font-semibold">{s.name}</span>
                  <span className="opacity-80"> · {s.locality}{s.operation ? ` · ${s.operation}` : ""}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
