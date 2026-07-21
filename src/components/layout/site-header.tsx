"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Comprar", href: "/imoveis?operacao=comprar" },
  { label: "Arrendar", href: "/imoveis?operacao=arrendar" },
  { label: "Vender", href: "/vender" },
  { label: "Investir", href: "/investir" },
  { label: "Crédito", href: "/credito" },
  { label: "Notícias", href: "/#noticias" },
];

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="HousePro — início">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ModeToggle />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button variant="brand" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/vender">Avaliação gratuita</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-md text-foreground md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/60 md:hidden",
          open ? "max-h-96" : "max-h-0 border-t-0"
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
          <Button variant="brand" className="mt-2" asChild>
            <Link href="/vender" onClick={() => setOpen(false)}>
              Avaliação gratuita
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
