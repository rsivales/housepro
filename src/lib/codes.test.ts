import { describe, it, expect } from "vitest";

import { buildPropertyReference, parsePropertyReference } from "./codes";

describe("buildPropertyReference", () => {
  it("gera HP<agência><agente 3 díg.>-<seq 2 díg.>", () => {
    expect(buildPropertyReference(1, 1, 1)).toBe("HP1001-01");
  });

  it("preenche com zeros à esquerda o agente e a sequência", () => {
    expect(buildPropertyReference(1, 12, 5)).toBe("HP1012-05");
  });

  it("suporta agências com código de vários dígitos sem ambiguidade", () => {
    expect(buildPropertyReference(12, 3, 7)).toBe("HP12003-07");
  });
});

describe("parsePropertyReference", () => {
  it("lê de volta o que buildPropertyReference gerou", () => {
    const ref = buildPropertyReference(1, 1, 1);
    expect(parsePropertyReference(ref)).toEqual({ agency: 1, agent: 1, seq: 1, reference: ref });
  });

  it("distingue corretamente agência de vários dígitos do agente", () => {
    const ref = buildPropertyReference(12, 3, 7);
    expect(parsePropertyReference(ref)).toEqual({ agency: 12, agent: 3, seq: 7, reference: ref });
  });

  it("devolve null para formatos não reconhecidos", () => {
    expect(parsePropertyReference("HP-1050")).toBeNull();
    expect(parsePropertyReference("1050012-3")).toBeNull();
  });
});
