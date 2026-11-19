import { describe, expect, it } from "vitest";
import { currentFeeMonth, validFeeAmount, validFeeMonth } from "./helix-fees";
import { computeLeg } from "@/lib/commission/tiers";
import { DEFAULT_REGIME, validateRegime } from "./commission-regime";
import { estimateDealCommission } from "@/lib/commission/deal-estimate";

describe("brand fee configuration", () => {
  it("rejects negative, fractional-cent and non-finite fees", () => {
    expect(validFeeAmount(300)).toBe(true);
    for (const value of [0, -1, 2.001, Infinity, "300", null]) expect(validFeeAmount(value)).toBe(false);
  });
  it("uses Lisbon billing months and disallows backdating", () => {
    expect(currentFeeMonth(new Date("2026-07-31T23:30:00Z"))).toBe("2026-08-01");
    expect(validFeeMonth("2026-11-01", "2026-11-01")).toBe(true);
    expect(validFeeMonth("2026-10-01", "2026-11-01")).toBe(false);
    expect(validFeeMonth("2026-13-01", "2026-11-01")).toBe(false);
  });
  it("prevents brokers from overriding the fixed commission bands", () => {
    expect(validateRegime(DEFAULT_REGIME)).toBe(true);
    expect(validateRegime({ ...DEFAULT_REGIME, ladder: [...DEFAULT_REGIME.ladder.slice(0,2), {upTo:null,withCompany:90,withoutCompany:80}] })).toBe(false);
  });
  it("uses 80% and 70% above 60k even beyond the old agency cap", () => {
    for (const [hasValidatedCompany, expected] of [[true,800],[false,700]] as const) {
      const leg = computeLeg({ legCommission:1000,priorFaturacao:60000,priorAgencyTake:100000,hasValidatedCompany });
      expect(leg.agentGross).toBe(expected);
      expect(leg.capReturnedToAgent).toBe(0);
    }
  });
  it("starts approved Pro Producers immediately at 80% regardless of company status", () => {
    const result=estimateDealCommission({ gross:1000,externalShare:null,coBroker:false,producerId:"a",buyerAgentId:null,allocations:null },
      new Map([["a",{id:"a",name:"Consultor",monthlyGross:0,companyValidated:false,proProducer:true}]]));
    expect(result.producers[0].agentGross).toBe(800);
    expect(result.producers[0].agentNet).toBe(760);
  });
});
