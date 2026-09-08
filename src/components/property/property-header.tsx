"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Menu, Share2, Check, X, Briefcase } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { track } from "@/lib/analytics";

const NAV = [
  { label: "Imóveis", href: "/imoveis" },
  { label: "Comprar", href: "/imoveis" },
  { label: "Vender", href: "/vender" },
  { label: "Investir", href: "/investir" },
  { label: "Guia HousePro", href: "/noticias" },
  { label: "Sobre nós", href: "/historias-reais" },
  { label: "Carreiras", href: "/carreiras" },
];

/**
 * Cabeçalho público compacto da página de imóvel: logótipo + favoritos +
 * partilha + menu. Sem ferramentas de administração. Coerente com a homepage.
 */
export function PropertyHeader() {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function share() {
    track("pdp_share");
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--card)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="HousePro — início">
          <Logo />
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/cliente/favoritos" aria-label="Favoritos" className="grid size-10 place-items-center rounded-full text-[var(--hp-navy)] transition-colors hover:bg-black/[0.05]">
            <Heart className="size-5" />
          </Link>
          <button type="button" onClick={share} aria-label="Partilhar" className="grid size-10 place-items-center rounded-full text-[var(--hp-navy)] transition-colors hover:bg-black/[0.05]">
            {copied ? <Check className="size-5 text-emerald-600" /> : <Share2 className="size-5" />}
          </button>
          <button type="button" onClick={() => setOpen(true)} aria-label="Menu" aria-expanded={open} className="grid size-10 place-items-center rounded-full text-[var(--hp-navy)] transition-colors hover:bg-black/[0.05]">
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-[var(--card)]">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-10 place-items-center rounded-full text-[var(--hp-navy)] hover:bg-black/[0.05]">
              <X className="size-6" />
            </button>
          </div>
          <nav className="flex flex-col px-4 sm:px-6">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="border-b border-black/[0.06] py-4 text-lg font-medium text-[var(--hp-navy)]">
                {n.label}
              </Link>
            ))}
            <Link href="/entrar" onClick={() => setOpen(false)} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[var(--hp-navy)] px-4 py-3 text-base font-semibold text-white">
              <Briefcase className="size-5" /> Profissionais
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
