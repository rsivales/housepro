import { describe, expect, it } from "vitest";
import { contactWait, valuationAnswers, websiteForm } from "./lead-answers";

describe("dados históricos da ficha de lead", () => {
  it("recupera os campos de avaliação guardados no resumo", () => {
    expect(valuationAnswers("Pedido de avaliação — Apartamento, Bom estado\nLocalização: Faro\nPrazo: Nos próximos três meses")).toEqual([
      { label: "Tipo de imóvel", value: "Apartamento" },
      { label: "Estado do imóvel", value: "Bom estado" },
      { label: "Localização", value: "Faro" },
      { label: "Prazo", value: "Nos próximos três meses" },
    ]);
    expect(valuationAnswers("Contacto iniciado via WhatsApp")).toEqual([]);
  });

  it("distingue o formulário de avaliação de cliques sem formulário", () => {
    expect(websiteForm("site", undefined, "Pedido de avaliação — Apartamento, Bom estado")).toBe("Avaliação de imóvel");
    expect(websiteForm("site", "Contacto via WhatsApp")).toBeUndefined();
    expect(websiteForm("facebook", "Avaliação de imóvel")).toBeUndefined();
  });

  it("calcula a espera em horas e em dias na viragem de 24 horas", () => {
    const start = "2026-11-09T14:00:00Z";
    const hours = (h: number) => Date.parse(start) + h * 3_600_000;
    expect(contactWait(start, hours(23))).toBe("23 h");
    expect(contactWait(start, hours(24))).toBe("1 dia");
    expect(contactWait(start, hours(51))).toBe("2 dias e 3 h");
  });
});
