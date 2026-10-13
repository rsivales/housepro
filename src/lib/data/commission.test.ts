import { describe, expect, it } from "vitest";
import { commissionFloor, commissionLabel, effectiveCommission, isBelowStandardCommission, propertyCommission, standardCommissionPct } from "./commission";
import { operationOf } from "@/lib/imovel/model";
import { properties } from "./mock";

describe("HousePro commission rules by operation", () => {
  it.each([500, 850, 1500, 5000])("uses 150%% of monthly rent %s without a sales floor", (rent) => {
    const c = { operation: "arrendamento", commissionType: "percent", commissionPct: 150 } as const;
    expect(effectiveCommission(rent, c)).toMatchObject({ amount: rent * 1.5, basis: "percent" });
    expect(isBelowStandardCommission(rent, c)).toBe(false);
    expect(commissionFloor(rent, c.operation)).toBe(0);
  });

  it.each(["arrendamento", "arrendamento_ano", "arrendamento_curto"])("uses rental rules for business type %s", (type) => {
    const operation = operationOf(type);
    expect(standardCommissionPct({ operation })).toBe(150);
    expect(effectiveCommission(850, { operation, commissionPct: 150 }).amount).toBe(1275);
  });

  it("compares fixed rental commissions with one and a half monthly rents", () => {
    const c = { operation: "arrendamento", commissionType: "fixed" } as const;
    expect(isBelowStandardCommission(850, { ...c, commissionFixed: 1275 })).toBe(false);
    expect(isBelowStandardCommission(850, { ...c, commissionFixed: 1274 })).toBe(true);
    expect(effectiveCommission(850, { ...c, commissionFixed: 1274 }).amount).toBe(1274);
  });

  it("flags a reduced rental rate without silently replacing its configured amount", () => {
    const c = { operation: "arrendamento", commissionPct: 100 } as const;
    expect(isBelowStandardCommission(850, c)).toBe(true);
    expect(effectiveCommission(850, c).amount).toBe(850);
    expect(commissionLabel(850, c)).toContain("100% da renda mensal");
  });

  it.each([[40000, 4000], [50000, 5000], [99999, 5000], [100000, 5000], [200000, 10000]])("preserves sales standards at price %s", (price, amount) => {
    expect(standardCommissionPct({ operation: "venda" })).toBe(5);
    expect(effectiveCommission(price, { operation: "venda", commissionPct: 5 }).amount).toBe(amount);
  });

  it("keeps legacy sales calls and justified sales exceptions working", () => {
    expect(effectiveCommission(40000, { commissionPct: 5 }).amount).toBe(4000);
    expect(effectiveCommission(40000, { operation: "venda", commissionPct: 5, commissionJustification: "Exceção" })).toMatchObject({ amount: 2000, basis: "override" });
  });

  it("uses the property's operation in the shared property calculator", () => {
    const p = { ...properties[0], operation: "arrendamento" as const, price: 850, commissionPct: 150, commissionType: "percent" as const };
    expect(propertyCommission(p).amount).toBe(1275);
    expect(commissionLabel(p.price, p)).toContain("150% da renda mensal");
  });
});
