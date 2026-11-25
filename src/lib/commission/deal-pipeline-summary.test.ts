import { describe, expect, it } from "vitest";

import { dealPipelineSummary } from "./deal-pipeline-summary";
import type { DealListItem } from "@/lib/db/deals";

type SummaryDeal = Pick<DealListItem, "amount" | "stage" | "financials">;
const estimate = (people: { id: string; agentGross: number; agentNet: number }[]) => ({
  status: "ready" as const,
  gross: 10000,
  externalShare: 0,
  retained: 10000,
  producers: people.map((p) => ({
    ...p, name: p.id, allocationPct: 50, commissionBase: 5000,
    royalties: 0, pension: 0, agentSplitPct: 80, companyValidated: true,
  })),
});

describe("consultant pipeline summary", () => {
  it("uses only the viewer's share and excludes closed and lost deals", () => {
    const financials = estimate([
      { id: "consultant", agentGross: 4000, agentNet: 3800 },
      { id: "colleague", agentGross: 4000, agentNet: 3800 },
    ]);
    const deals: SummaryDeal[] = [
      { amount: 200000, stage: "cpcv", financials },
      { amount: 300000, stage: "concluido", financials },
      { amount: 100000, stage: "cancelado", financials },
    ];
    expect(dealPipelineSummary(deals, "consultant")).toEqual({
      activeCount: 1, closingCount: 1, completedCount: 1,
      propertyValue: 200000, gross: 4000, afterDeductions: 3800,
      missingForecast: 0,
    });
  });

  it("does not turn missing splits or another consultant's share into revenue", () => {
    const deals: SummaryDeal[] = [
      { amount: 270000, stage: "reserva", financials: estimate([{ id: "other", agentGross: 10800, agentNet: 10260 }]) },
      { amount: 350000, stage: "proposta_enviada", financials: undefined },
    ];
    expect(dealPipelineSummary(deals, "consultant")).toMatchObject({
      activeCount: 2, propertyValue: 620000, gross: 0,
      afterDeductions: 0, missingForecast: 2,
    });
  });
});
