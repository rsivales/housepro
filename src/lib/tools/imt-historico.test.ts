import { describe, expect, it } from "vitest";
import { calcularImtNoAno, suportaImtHistorico } from "./imt";

describe("IMT histórico para despesas de aquisição", () => {
  const base = { fin: "hpp" as const, loc: "continente" as const, preco: 180000 };

  it("usa escalões do ano da compra, e não os de 2026", () => {
    expect(calcularImtNoAno(base, 2023).imt).toBeCloseTo(180000 * .05 - 5924.50, 2);
    expect(calcularImtNoAno(base, 2025).imt).toBeCloseTo(180000 * .05 - 6363.76, 2);
    expect(calcularImtNoAno(base, 2026).imt).toBeCloseTo(180000 * .05 - 6491.02, 2);
    expect(calcularImtNoAno(base, 2025).isAquisicao).toBe(1440);
  });

  it("distingue habitação secundária e VPT superior ao preço", () => {
    const r = calcularImtNoAno({ ...base, fin: "secundaria", vpt: 200000 }, 2024);
    expect(r.base).toBe(200000);
    expect(r.usouVpt).toBe(true);
    expect(r.imt).toBeCloseTo(200000 * .07 - 9003.25, 2);
    expect(r.isAquisicao).toBe(1600);
  });

  it("não atribui IMT Jovem antes da entrada em vigor nem inventa anos não suportados", () => {
    expect(() => calcularImtNoAno({ ...base, jovem: true }, 2023)).toThrow();
    expect(() => calcularImtNoAno({ ...base, jovem: true }, 2024)).toThrow();
    expect(() => calcularImtNoAno({ ...base, jovem: true }, 2024, "2024-07-31")).toThrow();
    expect(calcularImtNoAno({ ...base, jovem: true }, 2024, "2024-08-01").total).toBe(0);
    expect(suportaImtHistorico(2016)).toBe(false);
    expect(() => calcularImtNoAno(base, 2016)).toThrow();
  });
});
