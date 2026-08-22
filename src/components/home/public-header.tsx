"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, ChevronDown, Menu, X, Briefcase } from "lucide-react";

import { Logo } from "@/components/brand/logo";

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
 * Cabeçalho público compacto. Transparente sobre o banner; passa a fundo branco
 * ao fazer scroll. Reutiliza o logótipo HousePro (não redesenhado).
 */
export function PublicHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const light = !scrolled; // texto claro sobre o banner
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: scrolled ? "var(--card)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: scrolled ? "0 6px 24px -18px rgba(11,31,58,.4)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="HousePro — início" className={light ? "text-white [&_*]:!text-white" : ""}>
          <Logo />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: light ? "rgba(255,255,255,0.92)" : "var(--foreground)" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/cliente/favoritos" aria-label="Favoritos" className="grid size-11 place-items-center rounded-full" style={{ color: light ? "#fff" : "var(--foreground)" }}>
            <Heart className="size-5" />
          </Link>
          <Link
            href="/entrar"
            className="hidden min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors sm:inline-flex"
            style={{ borderColor: light ? "rgba(255,255,255,0.5)" : "var(--border)", color: light ? "#fff" : "var(--foreground)" }}
          >
            <Briefcase className="size-4" /> Profissionais
          </Link>
          <button aria-label="Idioma: Português" className="hidden min-h-[44px] items-center gap-1 rounded-full px-2 text-sm font-semibold sm:inline-flex" style={{ color: light ? "#fff" : "var(--foreground)" }}>
            PT <ChevronDown className="size-4" />
          </button>
          <button onClick={() => setOpen(true)} aria-label="Menu" className="grid size-11 place-items-center rounded-full lg:hidden" style={{ color: light ? "#fff" : "var(--foreground)" }}>
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[var(--card)] lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-11 place-items-center rounded-full">
              <X className="size-6" />
            </button>
          </div>
          <nav className="flex flex-col px-4">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="border-b border-[var(--border)] py-4 text-lg font-medium">
                {n.label}
              </Link>
            ))}
            <Link href="/cliente/favoritos" onClick={() => setOpen(false)} className="flex items-center gap-2 border-b border-[var(--border)] py-4 text-lg font-medium">
              <Heart className="size-5" /> A minha conta
            </Link>
            <Link href="/entrar" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 rounded-full px-4 py-3 text-lg font-semibold text-white" style={{ background: "var(--hp-navy)" }}>
              <Briefcase className="size-5" /> Profissionais
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
