import { describe, it, expect } from "vitest";

import {
  suggestedScript,
  scriptByKey,
  stageNameForResult,
  nextTaskForResult,
  CALL_SCRIPTS,
} from "@/lib/data/xcall";

describe("X Call — guiões", () => {
  it("sugere o guião a partir da pista", () => {
    expect(suggestedScript("vendedor")).toBe("proprietario");
    expect(suggestedScript("recrutamento")).toBe("recrutamento");
    expect(suggestedScript("investidor")).toBe("investimento");
    expect(suggestedScript("comprador")).toBe("comprador");
    expect(suggestedScript(undefined)).toBe("comprador");
  });
  it("todos os guiões têm objetivo e perguntas", () => {
    for (const s of CALL_SCRIPTS) {
      expect(s.objective.length).toBeGreaterThan(0);
      expect(s.questions.length).toBeGreaterThan(0);
    }
    expect(scriptByKey("proposta").label).toBe("Proposta");
  });
});

describe("X Call — resultado → pipeline / próximo passo", () => {
  it("mapeia resultado para etapa", () => {
    expect(stageNameForResult("qualificada")).toBe("Qualificada");
    expect(stageNameForResult("visita_marcada")).toBe("Visita");
    expect(stageNameForResult("sem_interesse")).toBe("Perdida");
    expect(stageNameForResult("atendeu")).toBe("Contactada");
    expect(stageNameForResult("nao_atendeu")).toBeUndefined();
  });
  it("sugere a próxima tarefa", () => {
    expect(nextTaskForResult("nao_atendeu")?.kind).toBe("call");
    expect(nextTaskForResult("visita_marcada")?.kind).toBe("visit");
    expect(nextTaskForResult("qualificada")?.kind).toBe("followup");
    expect(nextTaskForResult("invalido")).toBeUndefined();
  });
});
