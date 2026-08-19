import { describe, it, expect } from "vitest";

import { propertyKpi, adQuality, perfSummary } from "@/lib/data/property-perf";
import type { Property } from "@/lib/data/types";

const now = new Date("2026-08-20T12:00:00Z");

const base = (over: Partial<Property> = {}): Property => ({
  id: "1",
  reference: "HP-1",
  title: "T2",
  operation: "venda",
  type: "Apartamento",
  typology: "T2",
  price: 200000,
  area: 80,
  beds: 2,
  baths: 1,
  parish: "x",
  municipality: "Faro",
  energy: "C",
  status: "novo",
  image: "",
  agentId: "rui",
  interest: 50,
  listedAt: "2026-08-18T00:00:00Z", // 2 dias
  gallery: ["a", "b", "c", "d", "e"],
  description: "x".repeat(200),
  shortDescription: "bom",
  videoUrl: "v",
  ...over,
});

describe("qualidade do anúncio", () => {
  it("anúncio completo pontua alto", () => {
    expect(adQuality(base()).score).toBeGreaterThanOrEqual(90);
  });
  it("penaliza fotos/descrição/media em falta", () => {
    const q = adQuality(base({ gallery: [], description: "curto", videoUrl: undefined, tourUrl: undefined, shortDescription: undefined }));
    expect(q.score).toBeLessThan(50);
    expect(q.issues).toContain("Sem fotografias");
  });
});

describe("KPIs acionáveis", () => {
  it("sem contacto quando 0 leads e já passou o prazo", () => {
    const k = propertyKpi(base({ listedAt: "2026-08-01T00:00:00Z" }), 0, now);
    expect(k.noContact).toBe(true);
  });
  it("pouca procura com interesse baixo", () => {
    const k = propertyKpi(base({ interest: 10, listedAt: "2026-08-01T00:00:00Z" }), 1, now);
    expect(k.lowDemand).toBe(true);
  });
  it("sugere rever preço quando está há muito tempo no mercado", () => {
    const k = propertyKpi(base({ listedAt: "2026-06-01T00:00:00Z", interest: 20 }), 0, now);
    expect(k.suggestReview).toBe(true);
  });
  it("imóvel novo e saudável não dispara alertas", () => {
    const k = propertyKpi(base({ interest: 80 }), 3, now);
    expect(k.noContact).toBe(false);
    expect(k.lowDemand).toBe(false);
    expect(k.suggestReview).toBe(false);
  });
});

describe("resumo", () => {
  it("conta os problemas do conjunto", () => {
    const s = perfSummary(
      [
        {
          property: base({ listedAt: "2026-06-01T00:00:00Z", interest: 10, gallery: [], description: "curto", videoUrl: undefined, tourUrl: undefined }),
          leadCount: 0,
        },
        { property: base({ interest: 80 }), leadCount: 3 },
      ],
      now
    );
    expect(s.total).toBe(2);
    expect(s.noContact).toBe(1);
    expect(s.poorAd).toBe(1);
  });
});
