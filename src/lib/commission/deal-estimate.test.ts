import { describe, it, expect } from "vitest";
import {
  estimateDealCommission,
  type DealEstimateInput,
} from "./deal-estimate";
const profiles = new Map([
  [
    "r",
    {
      id: "r",
      name: "Rodrigo Silva",
      monthlyGross: 0,
      companyValidated: false,
    },
  ],
  [
    "m",
    { id: "m", name: "Manuela Lança", monthlyGross: 0, companyValidated: true },
  ],
]);
const input: DealEstimateInput = {
  gross: 17500,
  externalShare: null,
  coBroker: false,
  producerId: "r",
  buyerAgentId: null,
  allocations: null,
};
describe("Deal commission projection", () => {
  it("shows personal gross, actual royalties, pension and net using the existing ladder", () => {
    const result = estimateDealCommission(input, profiles);
    expect(result.status).toBe("ready");
    expect(result.producers[0]).toMatchObject({
      agentGross: 7750,
      royalties: 232.5,
      pension: 155,
      agentNet: 7362.5,
    });
  });
  it("uses the registered validated company rather than an assumed company", () => {
    expect(
      estimateDealCommission({ ...input, producerId: "m" }, profiles)
        .producers[0].agentNet,
    ).toBe(9025);
  });
  it("deducts external agency participation before the personal split", () => {
    const result = estimateDealCommission(
      { ...input, coBroker: true, externalShare: 8750 },
      profiles,
    );
    expect(result.retained).toBe(8750);
    expect(result.producers[0]).toMatchObject({
      commissionBase: 8750,
      agentGross: 3500,
      royalties: 105,
      pension: 70,
      agentNet: 3325,
    });
  });
  it("does not invent a split for two distinct consultants", () => {
    expect(
      estimateDealCommission({ ...input, buyerAgentId: "m" }, profiles).status,
    ).toBe("missing");
  });
  it("uses the actual configured co-agent allocation", () => {
    const result = estimateDealCommission(
      {
        ...input,
        buyerAgentId: "m",
        allocations: [
          { agent_id: "r", pct: 60 },
          { agentId: "m", pct: 40 },
        ],
      },
      profiles,
    );
    expect(result.producers.map((p) => p.commissionBase)).toEqual([
      10500, 7000,
    ]);
  });
  it("rejects incomplete and excessive internal allocations", () => {
    for (const pct of [0, 50, 101, NaN])
      expect(
        estimateDealCommission(
          { ...input, allocations: [{ agent_id: "r", pct }] },
          profiles,
        ).status,
      ).toBe("missing");
  });
  it("does not turn missing financial inputs into fictitious earnings", () => {
    expect(
      estimateDealCommission({ ...input, gross: null }, profiles).status,
    ).toBe("missing");
    expect(estimateDealCommission(input, new Map()).status).toBe("missing");
    expect(
      estimateDealCommission(
        { ...input, coBroker: true, externalShare: 20000 },
        profiles,
      ).status,
    ).toBe("missing");
  });
  it("respects the registered accumulated cycle and agency cap", () => {
    const result = estimateDealCommission(
      { ...input, gross: 10000 },
      new Map([["r", { ...profiles.get("r")!, monthlyGross: 400000 }]]),
    );
    expect(result.producers[0]).toMatchObject({
      agentGross: 10000,
      royalties: 300,
      pension: 200,
      agentNet: 9500,
    });
  });
  it("conserves cents across many allocation shares without negative last shares", () => {
    const p = new Map(
      Array.from({ length: 6 }, (_, i) => [
        String(i),
        { id: String(i), name: "", monthlyGross: 0, companyValidated: false },
      ]),
    );
    const result = estimateDealCommission(
      {
        ...input,
        gross: 0.04,
        allocations: Array.from({ length: 6 }, (_, i) => ({
          agent_id: String(i),
          pct: i === 5 ? 15 : 17,
        })),
      },
      p,
    );
    expect(result.status).toBe("ready");
    expect(
      result.producers.reduce((s, p) => s + p.commissionBase, 0),
    ).toBeCloseTo(0.04, 5);
    expect(result.producers.every((p) => p.commissionBase >= 0)).toBe(true);
  });
  it("rounds displayed deductions so they reconcile exactly to the displayed net", () => {
    const p = estimateDealCommission({ ...input, gross: 17531.77 }, profiles)
      .producers[0];
    expect(Math.round((p.agentGross - p.royalties - p.pension) * 100)).toBe(
      Math.round(p.agentNet * 100),
    );
  });
});
