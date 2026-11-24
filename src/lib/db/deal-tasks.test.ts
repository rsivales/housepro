import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_TEMPLATE } from "./deal-tasks";

describe("Helix checklist padrão", () => {
  it("não tem códigos repetidos (viola a unicidade deal_id+code)", () => {
    const codes = DEFAULT_TASK_TEMPLATE.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("cobre todas as fases do motor de checklist", () => {
    const phases = new Set(DEFAULT_TASK_TEMPLATE.map((t) => t.phase));
    expect(phases).toEqual(
      new Set(["pre_cpcv", "credito", "post_cpcv", "pre_escritura", "post_escritura"]),
    );
  });

  it("tarefas de crédito e pós-CPCV ficam a cargo do cliente, nunca internal-only por omissão", () => {
    const credito = DEFAULT_TASK_TEMPLATE.filter((t) => t.phase === "credito");
    expect(credito.every((t) => t.audience === "buyer")).toBe(true);
    const posCpcv = DEFAULT_TASK_TEMPLATE.filter((t) => t.phase === "post_cpcv");
    expect(posCpcv.every((t) => t.audience === "seller")).toBe(true);
  });
});
