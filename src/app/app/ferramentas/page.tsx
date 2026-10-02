"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, ExternalLink, Home, Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImtCalculator } from "@/components/tools/imt-calculator";
import { CreditSimulator } from "@/components/property/credit-simulator";
import { MaisValiasCalculator } from "@/components/tools/mais-valias-calculator";

/**
 * As três calculadoras operacionais ficam na área de trabalho Helix.
 */
const TABS = [
  { id: "imt", label: "IMT + Imposto de Selo", icon: Calculator },
  { id: "credito", label: "Crédito à habitação", icon: Home },
  { id: "maisvalias", label: "Mais-valias", icon: Coins },
] as const;

export default function FerramentasConsultor() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("imt");
  const publicHref = tab === "maisvalias" ? "/ferramentas/calculadora-mais-valias" : tab === "credito" ? "/credito" : "/ferramentas/imt";

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
            href={publicHref}
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
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
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
          {tab === "credito" && (
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <p className="mb-6 rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">Simulação indicativa de prestação, útil para enquadrar a conversa com o cliente.</p>
              <CreditSimulator />
            </div>
          )}
          {tab === "maisvalias" && (
            <>
              <p className="mb-6 rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">Estimativa de trabalho. Confirme sempre o enquadramento fiscal e os comprovativos antes de aconselhar o cliente.</p>
              <MaisValiasCalculator />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
