"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

type TabKey = "comprar" | "arrendar" | "investir";

const TABS: { key: TabKey; label: string; build: (v: string) => string }[] = [
  { key: "comprar", label: "Comprar", build: (v) => `/imoveis?operacao=comprar&local=${encodeURIComponent(v)}` },
  { key: "arrendar", label: "Arrendar", build: (v) => `/imoveis?operacao=arrendar&local=${encodeURIComponent(v)}` },
  { key: "investir", label: "Investir", build: (v) => `/investir?perfil=${encodeURIComponent(v)}` },
];

/**
 * Pesquisa da homepage — sobrepõe o banner. Separadores Comprar/Arrendar/
 * Investir, campo "Onde quer viver?" e ligação a pesquisa avançada.
 * Reutiliza a lógica de rotas existente (/imoveis, /investir).
 */
export function HeroSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = React.useState<TabKey>("comprar");
  const [value, setValue] = React.useState("");
  const tab = TABS.find((t) => t.key === active)!;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(tab.build(value.trim()));
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-2xl sm:p-5", className)} style={{ boxShadow: "0 30px 60px -30px rgba(11,31,58,0.45)" }}>
      {/* Separadores */}
      <div className="flex items-center gap-6 border-b" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="Tipo de operação">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className="relative -mb-px pb-3 pt-1 text-sm font-semibold transition-colors"
            style={{ color: active === t.key ? "var(--hp-navy)" : "var(--muted-foreground)" }}
          >
            {t.label}
            {active === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ background: "var(--hp-red)" }} />
            )}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-3" style={{ background: "var(--secondary)" }}>
          <MapPin className="size-5 shrink-0" style={{ color: "var(--hp-navy)" }} />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Onde quer viver?"
            aria-label="Onde quer viver?"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          aria-label="Procurar"
          className="hp-btn-red grid size-12 shrink-0 place-items-center rounded-xl shadow-md"
        >
          <ArrowRight className="size-5" />
        </button>
      </form>

      <div className="mt-3 text-center">
        <Link
          href="/imoveis"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" /> Pesquisa avançada
        </Link>
      </div>
    </div>
  );
}
