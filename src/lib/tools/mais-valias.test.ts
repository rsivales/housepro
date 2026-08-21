import { describe, it, expect } from "vitest";

import { calcularMaisValias, type MaisValiasInput } from "./mais-valias";

const base: MaisValiasInput = {
  venda: 350000,
  aquisicao: 220000,
  coeficiente: 1,
  despesas: 15000,
  encargos: 10000,
  fracaoTributavel: 0.5,
  reinvestimento: false,
  taxaMarginal: 0.32,
};

describe("calcularMaisValias", () => {
  it("apura mais-valia, base tributável (50%) e imposto", () => {
    const r = calcularMaisValias(base);
    expect(r.maisValia).toBe(105000); // 350000 - 220000 - 15000 - 10000
    expect(r.baseTributavel).toBe(52500); // 50%
    expect(Math.round(r.imposto)).toBe(16800); // 52500 * 0,32
    expect(r.menosValia).toBe(false);
  });

  it("aplica o coeficiente de desvalorização ao valor de aquisição", () => {
    const r = calcularMaisValias({ ...base, aquisicao: 200000, coeficiente: 1.1 });
    expect(r.aquisicaoCorrigida).toBeCloseTo(220000, 2);
  });

  it("menos-valia não gera imposto", () => {
    const r = calcularMaisValias({ ...base, venda: 200000, aquisicao: 250000 });
    expect(r.menosValia).toBe(true);
    expect(r.imposto).toBe(0);
    expect(r.baseTributavel).toBe(0);
  });

  it("reinvestimento em HPP isenta a mais-valia", () => {
    const r = calcularMaisValias({ ...base, reinvestimento: true });
    expect(r.baseTributavel).toBe(0);
    expect(r.imposto).toBe(0);
  });
});
