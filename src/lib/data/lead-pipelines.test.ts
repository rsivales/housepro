import { describe, expect, it } from "vitest";
import { hasPipelinePhone, validPipelineSettings } from "./lead-pipelines";

describe("CRM lead pipelines", () => {
  it("accepts real phone formats and filters anonymous clicks and email-only leads", () => {
    expect(hasPipelinePhone("+351 912 345 678")).toBe(true);
    expect(hasPipelinePhone("(212) 555-0136")).toBe(true);
    for (const value of ["(contacto via WhatsApp)", "(contacto via Chamada)", "lead@example.com", "1-------", "1234567890123456", ""]) {
      expect(hasPipelinePhone(value)).toBe(false);
    }
  });

  it("requires a name and distinct, nonempty stages", () => {
    expect(validPipelineSettings("Investidores", ["Novo", "Reunião"])).toBe(true);
    expect(validPipelineSettings("  ", ["Novo", "Reunião"])).toBe(false);
    expect(validPipelineSettings("Investidores", ["Novo", " novo "])).toBe(false);
    expect(validPipelineSettings("Investidores", ["Novo", ""])).toBe(false);
  });
});
