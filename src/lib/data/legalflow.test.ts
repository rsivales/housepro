import { describe, it, expect } from "vitest";

import {
  templateSections,
  serviceFor,
  DEFAULT_LAWYER_CONFIG,
  DOC_TYPE_LABEL,
} from "@/lib/data/legalflow";

describe("LegalFlow — ambiente do advogado", () => {
  it("a consulta jurídica tem modelo próprio", () => {
    expect(DOC_TYPE_LABEL.consulta).toBe("Consulta jurídica");
    const s = templateSections("consulta");
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((x) => x.title.includes("Parecer"))).toBe(true);
  });
  it("serviceFor devolve o honorário configurado", () => {
    const cpcv = serviceFor(DEFAULT_LAWYER_CONFIG, "cpcv");
    expect(cpcv?.basePrice).toBeGreaterThan(0);
    expect(cpcv?.active).toBe(true);
  });
  it("um serviço inativo não é devolvido", () => {
    const cfg = {
      ...DEFAULT_LAWYER_CONFIG,
      services: DEFAULT_LAWYER_CONFIG.services.map((s) => (s.type === "procuracao" ? { ...s, active: false } : s)),
    };
    expect(serviceFor(cfg, "procuracao")).toBeUndefined();
  });
});
