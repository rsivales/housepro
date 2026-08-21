"use client";

import * as React from "react";
import { Calculator, Home, Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImtCalculator } from "@/components/tools/imt-calculator";
import { CreditSimulator } from "@/components/property/credit-simulator";
import { MaisValiasCalculator } from "@/components/tools/mais-valias-calculator";

type Key = "imt" | "credito" | "mais-valias";

const TABS: { key: Key; label: string; icon: React.ElementType; sub: string }[] = [
  { key: "imt", label: "IMT + Imposto de Selo", icon: Calculator, sub: "Impostos na compra" },
  { key: "credito", label: "Crédito à habitação", icon: Home, sub: "Prestação e esforço" },
  { key: "mais-valias", label: "Mais-valias", icon: Coins, sub: "Imposto na venda" },
];

/**
 * Todas as calculadoras numa só página, por separadores. O separador ativo
 * sincroniza com o hash do URL (#imt, #credito, #mais-valias) para ligações
 * diretas a partir da homepage.
 */
export function CalculatorsTabs() {
  const [active, setActive] = React.useState<Key>("imt");

  React.useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "") as Key;
      if (TABS.some((t) => t.key === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(k: Key) {
    setActive(k);
    if (typeof history !== "undefined") history.replaceState(null, "", `#${k}`);
  }

  return (
    <div>
      <div role="tablist" aria-label="Calculadoras" className="grid grid-cols-3 gap-2 sm:gap-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => choose(t.key)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left",
              active === t.key ? "border-primary bg-primary/5" : "hover:bg-secondary",
            )}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
              <t.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight sm:text-sm">{t.label}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {active === "imt" && <ImtCalculator />}
        {active === "credito" && (
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <CreditSimulator />
          </div>
        )}
        {active === "mais-valias" && <MaisValiasCalculator />}
      </div>
    </div>
  );
}
