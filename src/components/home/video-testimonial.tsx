"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { youTubeEmbedUrl, youTubeId, youTubePoster } from "@/lib/video";

export interface Testimonial {
  quote: string;
  name: string;
  locality: string;
  operation?: string;
  /** Vídeo carregado no admin (com consentimento). Sem `videoSrc` mostra só a capa. */
  videoSrc?: string;
  poster?: string;
  /** Legendas (WebVTT) — acessibilidade. */
  captionsSrc?: string;
  /** Transcrição textual do vídeo. */
  transcript?: string;
}

/**
 * Testemunho em vídeo. NUNCA reproduz com som automaticamente: só arranca ao
 * clique. Capa (poster), legendas e transcrição para acessibilidade.
 * Consentimento e privacidade geridos no admin (registo de consentimentos).
 */
export function VideoTestimonial({ t }: { t: Testimonial }) {
  const [playing, setPlaying] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(false);
  // Links do YouTube tocam no leitor do YouTube (iframe); ficheiros de vídeo no <video>.
  const ytId = youTubeId(t.videoSrc);
  const poster = t.poster || (ytId ? youTubePoster(ytId) : undefined);

  return (
    <figure className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative aspect-video">
        {ytId && playing ? (
          <iframe
            src={youTubeEmbedUrl(ytId)}
            title={`Testemunho de ${t.name}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : t.videoSrc && playing ? (
          <video
            src={t.videoSrc}
            poster={poster}
            controls
            autoPlay
            playsInline
            className="size-full object-cover"
          >
            {t.captionsSrc && <track kind="captions" srcLang="pt" label="Português" src={t.captionsSrc} default />}
          </video>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: poster
                ? `url(${poster}) center/cover`
                : "linear-gradient(120deg, #244765 0%, #0B1F3A 70%)",
            }}
          >
            <div className="absolute inset-0 bg-[rgba(11,31,58,0.35)]" />
            {t.videoSrc && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Ver testemunho de ${t.name}`}
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid size-16 place-items-center rounded-full bg-white/90 text-[var(--hp-navy)] shadow-lg transition-transform hover:scale-105">
                  <Play className="size-7 translate-x-0.5 fill-current" />
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <figcaption className="p-6 sm:p-8">
        <blockquote className="font-display text-xl leading-snug sm:text-2xl">
          “{t.quote}”
        </blockquote>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t.name}</span> · {t.locality}
          {t.operation ? ` · ${t.operation}` : ""}
        </p>

        {t.transcript && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="text-sm font-medium text-[var(--hp-navy)] underline-offset-2 hover:underline"
              aria-expanded={showTranscript}
            >
              {showTranscript ? "Ocultar transcrição" : "Ler transcrição"}
            </button>
            {showTranscript && <p className="mt-2 text-sm text-muted-foreground">{t.transcript}</p>}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
