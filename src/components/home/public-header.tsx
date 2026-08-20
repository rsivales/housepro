"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Globe, Menu, X } from "lucide-react";

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
          <button aria-label="Idioma (Português)" className="hidden size-11 place-items-center rounded-full sm:grid" style={{ color: light ? "#fff" : "var(--foreground)" }}>
            <Globe className="size-5" />
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
            <Link href="/cliente/favoritos" onClick={() => setOpen(false)} className="flex items-center gap-2 py-4 text-lg font-medium">
              <Heart className="size-5" /> Favoritos
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
