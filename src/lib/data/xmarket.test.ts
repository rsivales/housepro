import { describe, it, expect } from "vitest";

import {
  creditRemaining,
  extraCost,
  usageLevel,
  needsApproval,
  canAfford,
  orderTotal,
  demoWallet,
  type CreditBalance,
  type Wallet,
} from "@/lib/data/xmarket";

const credit = (included: number, consumed: number, extra = 0.01): CreditBalance => ({
  type: "email",
  included,
  consumed,
  unitCostExtra: extra,
});

describe("créditos", () => {
  it("restantes e excedente", () => {
    expect(creditRemaining(credit(1000, 400))).toBe(600);
    expect(creditRemaining(credit(1000, 1200))).toBe(-200);
    expect(extraCost(credit(1000, 1200, 0.01))).toBeCloseTo(2);
    expect(extraCost(credit(1000, 800))).toBe(0);
  });

  it("alertas a 75/90/100 e excedido", () => {
    expect(usageLevel(credit(100, 50)).alert).toBe("ok");
    expect(usageLevel(credit(100, 80)).alert).toBe("aviso75");
    expect(usageLevel(credit(100, 92)).alert).toBe("aviso90");
    expect(usageLevel(credit(100, 100)).alert).toBe("esgotado");
    expect(usageLevel(credit(100, 130)).alert).toBe("excedido");
    expect(usageLevel(credit(0, 0)).alert).toBe("ok");
  });
});

describe("carteira / aprovação", () => {
  const w: Wallet = demoWallet("rui", "Rui");

  it("needsApproval acima do limite", () => {
    expect(needsApproval(120, 100)).toBe(true);
    expect(needsApproval(80, 100)).toBe(false);
    expect(needsApproval(120, undefined)).toBe(false);
  });

  it("canAfford respeita saldo e orçamento mensal", () => {
    // saldo 120, orçamento 300, gasto 96 → resta 204 no mês
    expect(canAfford(w, 100)).toBe(true);
    expect(canAfford(w, 130)).toBe(false); // saldo insuficiente
    expect(canAfford({ ...w, balance: 1000 }, 250)).toBe(false); // estoura o orçamento mensal
  });

  it("orderTotal soma os itens", () => {
    expect(orderTotal([{ productId: "a", name: "x", qty: 2, unitPrice: 10 }, { productId: "b", name: "y", qty: 1, unitPrice: 5 }])).toBe(25);
  });
});
