"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { track } from "@/lib/analytics";

const LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Metodologia", href: "#metodologia" },
  { label: "Perguntas frequentes", href: "#faq" },
  { label: "Site HousePro", href: "/" },
];

/** Cabeçalho compacto da Clínica de Finanças (simuladores e informação imobiliária). */
export function ClinicaHeader() {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--card)]/95 backdrop-blur" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="HousePro — início" className="flex items-center gap-3">
          <Logo />
          <span className="hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} aria-hidden />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold" style={{ color: "var(--hp-navy)" }}>Clínica de Finanças</span>
            <span className="text-[0.7rem] text-muted-foreground">Simuladores e informação imobiliária</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <a href="#simular" onClick={() => track("mv_consultant_click")} className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold sm:inline-flex" style={{ color: "var(--hp-navy)" }}>
            <Phone className="size-4" /> Contacte-nos
          </a>
          <a href="#simular" aria-label="Contacte-nos" className="grid size-11 place-items-center rounded-full sm:hidden" style={{ color: "var(--hp-navy)" }}>
            <Phone className="size-5" />
          </a>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open} className="grid size-11 place-items-center rounded-full" style={{ color: "var(--foreground)" }}>
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-[var(--card)] px-4 py-2 sm:px-6" style={{ borderColor: "var(--border)" }}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block border-b py-3 text-sm font-medium last:border-0" style={{ borderColor: "var(--border)" }}>{l.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
