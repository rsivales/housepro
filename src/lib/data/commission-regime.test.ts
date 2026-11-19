import { describe, expect, it } from "vitest";
import { DEFAULT_REGIME, regimeForCalculator, validateRegime } from "./commission-regime";
import { estimateDealCommission } from "@/lib/commission/deal-estimate";

describe("broker commission regime", () => {
  it("keeps mandatory brand and pension contributions outside editable broker parameters", () => {
    expect(validateRegime(DEFAULT_REGIME)).toBe(true);
    expect(validateRegime({ ...DEFAULT_REGIME, royaltiesPct: 0 })).toBe(false);
    expect(validateRegime({ ...DEFAULT_REGIME, brokerPensionPct: 0 })).toBe(false);
    expect(validateRegime({ ...DEFAULT_REGIME, otherIncomeShares: { ...DEFAULT_REGIME.otherIncomeShares, credito: 120 } })).toBe(false);
    expect(validateRegime({ ...DEFAULT_REGIME, ladder: [{ upTo: 50000, withCompany: 50, withoutCompany: 40 }, { upTo: 10000, withCompany: 60, withoutCompany: 50 }, DEFAULT_REGIME.ladder[2]] })).toBe(false);
  });
  it("normalizes legacy agency ladders to the mandatory brand bands", () => {
    const input = { gross: 10000, externalShare: null, coBroker: false, producerId: "a", buyerAgentId: null, allocations: null };
    const profiles = new Map([["a", { id: "a", name: "Consultor", monthlyGross: 0, companyValidated: true }]]);
    const original = estimateDealCommission(input, profiles);
    const changed = estimateDealCommission(input, profiles, regimeForCalculator({ ...DEFAULT_REGIME, ladder: [{ ...DEFAULT_REGIME.ladder[0], withCompany: 65 }, ...DEFAULT_REGIME.ladder.slice(1)] }));
    expect(changed).toEqual(original);
    expect(estimateDealCommission(input, profiles)).toEqual(original);
  });
});
