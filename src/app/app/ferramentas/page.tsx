"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, ExternalLink, Home, Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImtCalculator } from "@/components/tools/imt-calculator";

/**
 * Ferramentas do consultor — separadores de calculadoras. Começa com a
 * calculadora de IMT + Imposto de Selo; preparado para acrescentar outras.
 */
const TABS = [
  { id: "imt", label: "IMT + Imposto de Selo", icon: Calculator, ready: true },
  { id: "credito", label: "Crédito à habitação", icon: Home, ready: false },
  { id: "maisvalias", label: "Mais-valias", icon: Coins, ready: false },
] as const;

export default function FerramentasConsultor() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("imt");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl">
              <Calculator className="size-7 text-primary" /> Ferramentas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Calculadoras para usar na relação com o cliente. Rápidas, oficiais e
              partilháveis.
            </p>
          </div>
          <Link
            href="/ferramentas/imt"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <ExternalLink className="size-4" /> Ver versão pública
          </Link>
        </div>

        {/* Separadores */}
        <div className="mt-6 flex flex-wrap gap-2 border-b">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!t.ready}
              onClick={() => t.ready && setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                !t.ready && "cursor-not-allowed opacity-50"
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              {!t.ready && <span className="text-xs">(em breve)</span>}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "imt" && (
            <>
              <p className="mb-6 rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">
                Base de cálculo: o maior valor entre o preço de escritura e o VPT.
                Escalões oficiais de 2026. Use o botão <strong>Copiar resumo</strong>{" "}
                para enviar ao cliente por WhatsApp ou email.
              </p>
              <ImtCalculator />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
