"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { track } from "@/lib/analytics";

const LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Perguntas frequentes", href: "#faq" },
  { label: "Site HousePro", href: "/" },
];

/**
 * Cabeçalho compacto da landing de avaliação. Sem seletor de modo escuro —
 * simples, para não desviar o visitante do objetivo (começar a avaliação).
 */
export function ValuationHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--card)]/95 backdrop-blur" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="HousePro — início">
          <Logo />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#comecar"
            onClick={() => track("valuation_contact_click")}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold sm:inline-flex"
            style={{ color: "var(--hp-navy)" }}
          >
            <Phone className="size-4" /> Contacte-nos
          </a>
          <a
            href="#comecar"
            onClick={() => track("valuation_contact_click")}
            aria-label="Contacte-nos"
            className="grid size-11 place-items-center rounded-full sm:hidden"
            style={{ color: "var(--hp-navy)" }}
          >
            <Phone className="size-5" />
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid size-11 place-items-center rounded-full"
            style={{ color: "var(--foreground)" }}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t bg-[var(--card)] px-4 py-2 sm:px-6" style={{ borderColor: "var(--border)" }}>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b py-3 text-sm font-medium last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
