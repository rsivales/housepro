"use client";

import * as React from "react";
import { Calculator } from "lucide-react";

import { track } from "@/lib/analytics";
import { CreditSimulator } from "@/components/property/credit-simulator";
import { CostWizard } from "@/components/property/cost-wizard";

/**
 * Simulador de financiamento — visível de imediato (sem clique para abrir):
 * simulador de prestação + assistente de custos.
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
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      track("pdp_finance_open");
    }
  }, []);

  return (
    <section aria-labelledby="fin-heading" className="rounded-2xl border bg-white">
      <div className="flex items-center gap-4 px-5 py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--hp-red)]/10 text-[var(--hp-red)]">
          <Calculator className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="fin-heading" className="block font-display text-lg text-[var(--hp-navy)]">
            Simule o financiamento
          </span>
          <span className="block text-sm text-[var(--hp-text-2)]">
            Uma estimativa da prestação mensal.
          </span>
        </span>
      </div>

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
    </section>
  );
}
