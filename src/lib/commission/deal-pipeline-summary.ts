import type { DealListItem } from "@/lib/db/deals";

/** Read-only totals for the consultant's active transaction pipeline. */
export function dealPipelineSummary(
  deals: Pick<DealListItem, "amount" | "stage" | "financials">[],
  consultantId: string,
) {
  const active = deals.filter(
    (deal) => deal.stage !== "cancelado" && deal.stage !== "concluido",
  );
  let propertyValue = 0;
  let gross = 0;
  let afterDeductions = 0;
  let missingForecast = 0;

  for (const deal of active) {
    if (Number.isFinite(deal.amount) && deal.amount > 0)
      propertyValue += deal.amount;
    const producer = deal.financials?.status === "ready"
      ? deal.financials.producers.find((p) => p.id === consultantId)
      : undefined;
    if (!producer) {
      missingForecast++;
      continue;
    }
    gross += producer.agentGross;
    afterDeductions += producer.agentNet;
  }

  return {
    activeCount: active.length,
    closingCount: active.filter((d) => d.stage === "cpcv" || d.stage === "escritura").length,
    completedCount: deals.filter((d) => d.stage === "concluido").length,
    propertyValue,
    gross,
    afterDeductions,
    missingForecast,
  };
}
