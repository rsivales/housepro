"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Home, Pause, Play } from "lucide-react";

import { type Banner } from "@/lib/data/banners";

const ROTATE_MS = 7000;

/**
 * Banner emocional dinâmico com rotação LENTA e não agressiva. Indicadores
 * clicáveis + botão de pausa. Pára em interação, ao passar o rato, quando um
 * campo está a ser preenchido (pesquisa) e respeita `prefers-reduced-motion`.
 * Fallback Deep Navy quando não há fotografia carregada no admin.
 */
export function DynamicHero({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const hoverRef = React.useRef(false);
  const banner = banners[index] ?? banners[0];

  // Sessão estável: memoriza o banner escolhido para não recomeçar do zero.
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem("hp:banner");
      const i = banners.findIndex((b) => b.id === stored);
      if (i > 0) setIndex(i);
    } catch {
      /* mantém o principal */
    }
  }, [banners]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem("hp:banner", banner.id);
    } catch {
      /* ignore */
    }
  }, [banner.id]);

  React.useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setInterval(() => {
      // Não muda enquanto se lê/preenche a pesquisa nem ao passar o rato.
      const el = document.activeElement;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (typing || hoverRef.current) return;
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [banners.length, paused]);

  return (
    <section
      className="relative isolate overflow-hidden"
      aria-roledescription="carrossel"
      aria-label="Destaques HousePro"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      {/* Fundo: fotografia (admin) ou Deep Navy elegante. */}
      {banner.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={banner.id}
          src={banner.image}
          alt={banner.alt ?? ""}
          className="absolute inset-0 -z-10 size-full object-cover"
          style={{ objectPosition: banner.focal ?? "center" }}
          fetchPriority="high"
        />
      ) : (
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(120% 120% at 78% 12%, #2b5476 0%, #0B1F3A 58%)" }}
          aria-hidden
        />
      )}
      {/* Gradiente para leitura (mais forte à esquerda). */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(100deg, rgba(11,31,58,0.94) 0%, rgba(11,31,58,0.72) 42%, rgba(11,31,58,0.28) 100%)" }}
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pb-28 sm:pt-28 lg:pt-32">
        <div className="max-w-2xl text-white">
          <h1 className="font-display text-4xl leading-[1.03] sm:text-5xl lg:text-[3.5rem]" style={{ textWrap: "balance" }}>
            {banner.title}
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/85 sm:text-lg">{banner.text}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={banner.primary.href} className="hp-btn-red inline-flex min-h-[48px] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg">
              <Search className="size-4" /> {banner.primary.label}
            </Link>
            {banner.secondary && (
              <Link href={banner.secondary.href} className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/45 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15">
                <Home className="size-4" /> {banner.secondary.label}
              </Link>
            )}
          </div>

          {banner.line && (
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{banner.line}</p>
          )}
        </div>

        {/* Controlos do carrossel */}
        {banners.length > 1 && (
          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center gap-2" role="tablist" aria-label="Escolher destaque">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Destaque ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === index ? 22 : 8,
                    background: i === index ? "#fff" : "rgba(255,255,255,0.45)",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Retomar rotação" : "Pausar rotação"}
              className="grid size-8 place-items-center rounded-full border border-white/40 text-white/90 transition-colors hover:bg-white/15"
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
