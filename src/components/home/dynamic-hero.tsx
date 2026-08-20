"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Home } from "lucide-react";

import { type Banner } from "@/lib/data/banners";

/**
 * Banner emocional dinâmico. Escolhe UM banner de forma estável por sessão
 * (não muda enquanto o visitante lê/pesquisa) — sem carrossel agressivo.
 * Fallback Deep Navy quando não há fotografia carregada no admin.
 */
export function DynamicHero({ banners }: { banners: Banner[] }) {
  const [banner, setBanner] = React.useState<Banner>(banners[0]);

  React.useEffect(() => {
    if (banners.length === 0) return;
    try {
      const KEY = "hp:banner";
      const stored = sessionStorage.getItem(KEY);
      const found = banners.find((b) => b.id === stored);
      // Sessão nova → banner de maior prioridade (o aprovado "principal").
      // A seleção fica estável durante a sessão; não muda enquanto se lê/pesquisa.
      const chosen = found ?? banners[0];
      sessionStorage.setItem(KEY, chosen.id);
      setBanner(chosen);
    } catch {
      /* mantém o principal */
    }
  }, [banners]);

  return (
    <section className="relative isolate overflow-hidden" aria-label="Destaque">
      {/* Fundo: fotografia (admin) ou Deep Navy elegante. */}
      {banner.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.image} alt={banner.alt ?? ""} className="absolute inset-0 -z-10 size-full object-cover" fetchPriority="high" />
      ) : (
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(120% 120% at 15% 10%, #244765 0%, #0B1F3A 55%)" }} aria-hidden />
      )}
      {/* Gradiente para leitura. */}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(105deg, rgba(11,31,58,0.92) 0%, rgba(11,31,58,0.7) 45%, rgba(11,31,58,0.35) 100%)" }} aria-hidden />

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:pt-32">
        <div className="max-w-2xl text-white">
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl" style={{ textWrap: "balance" }}>
            {banner.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{banner.text}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={banner.primary.href} className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold shadow-lg">
              <Search className="size-4" /> {banner.primary.label}
            </Link>
            {banner.secondary && (
              <Link href={banner.secondary.href} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15">
                <Home className="size-4" /> {banner.secondary.label}
              </Link>
            )}
          </div>

          {banner.line && (
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{banner.line}</p>
          )}
        </div>
      </div>
    </section>
  );
}
