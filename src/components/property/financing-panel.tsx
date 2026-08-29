"use client";

import * as React from "react";
import { Calculator, ChevronDown } from "lucide-react";

import { track } from "@/lib/analytics";
import { CreditSimulator } from "@/components/property/credit-simulator";
import { CostWizard } from "@/components/property/cost-wizard";

/**
 * Financiamento recolhido: mostra apenas um resumo com "Abrir simulador".
 * Ao abrir revela o simulador de prestação + o assistente de custos, sem
 * ocupar o scroll quando está fechado. As fórmulas e notas de responsabilidade
 * são as já validadas nos componentes existentes.
 */
export function FinancingPanel({
  price,
  propertyId,
  reference,
  referrerId,
}: {
  price: number;
  propertyId: string;
  reference: string;
  referrerId?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section aria-labelledby="fin-heading" className="rounded-2xl border bg-white">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("pdp_finance_open");
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--hp-red)]/10 text-[var(--hp-red)]">
          <Calculator className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="fin-heading" className="block font-display text-lg text-[var(--hp-navy)]">
            Simule o financiamento
          </span>
          <span className="block text-sm text-[var(--hp-text-2)]">
            Veja uma estimativa da prestação mensal.
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--hp-red)] px-3.5 py-1.5 text-sm font-medium text-[var(--hp-red)]">
          {open ? "Fechar" : "Abrir simulador"}
          <ChevronDown className={"size-4 transition-transform " + (open ? "rotate-180" : "")} />
        </span>
      </button>

      {open && (
        <div className="border-t px-5 py-5">
          <CreditSimulator initialPrice={price} />
          <div className="mt-6 border-t pt-5">
            <CostWizard propertyId={propertyId} reference={reference} price={price} referrerId={referrerId} />
            <p className="mt-2 text-center text-xs text-[var(--hp-text-2)]">
              Valores indicativos e estimados. Não constituem uma proposta bancária
              nem dispensam simulação de crédito e a validação do consultor.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
