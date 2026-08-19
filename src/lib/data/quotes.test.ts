import { describe, it, expect } from "vitest";

import { quoteOfDay, quoteTextOfDay, GENERAL_QUOTES } from "@/lib/data/quotes";

describe("frase do dia", () => {
  it("é determinística no mesmo dia", () => {
    const d = new Date("2026-03-14T08:00:00");
    expect(quoteOfDay(d).text).toBe(quoteOfDay(d).text);
  });
  it("muda ao longo dos dias (rotação)", () => {
    const a = quoteTextOfDay(new Date("2026-03-14T08:00:00"));
    const b = quoteTextOfDay(new Date("2026-03-15T08:00:00"));
    expect(a).not.toBe(b);
  });
  it("sai da biblioteca geral", () => {
    expect(GENERAL_QUOTES).toContain(quoteTextOfDay(new Date("2026-03-14T08:00:00")));
  });

  it("datas comemorativas têm prioridade", () => {
    const natal = quoteOfDay(new Date("2026-12-25T10:00:00"));
    expect(natal.tag).toBe("comemorativa");
    expect(natal.text).toMatch(/Festas/i);
  });

  it("aniversário do próprio tem prioridade máxima", () => {
    const q = quoteOfDay(new Date("2026-05-09T10:00:00"), { birthday: "05-09" });
    expect(q.tag).toBe("aniversario");
  });

  it("frases de campanha (extra) entram para o dia certo", () => {
    const q = quoteOfDay(new Date("2026-07-01T10:00:00"), {
      extra: [{ text: "Campanha de verão!", date: "07-01", tag: "comemorativa" }],
    });
    expect(q.text).toBe("Campanha de verão!");
  });
});
