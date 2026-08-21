import { describe, it, expect } from "vitest";

import {
  validateStep, validateSubmission, parseCampaign, resolveConsultant,
  dedupeKey, buildLead, isValidEmail, isValidPhone, FORM_VERSION,
  type ValuationSubmission,
} from "./valuation";

const full: ValuationSubmission = {
  location: "Faro", propertyType: "Apartamento", propertyCondition: "Bom estado",
  name: "Maria", email: "maria@example.com", phone: "", consent: true,
  reason: "Quero conhecer o valor", timeframe: "Ainda não decidi",
};

describe("validação por etapas", () => {
  it("etapa 1 exige localização, tipo e estado", () => {
    const e = validateStep(0, { location: "", propertyType: "", propertyCondition: "" });
    expect(Object.keys(e)).toEqual(expect.arrayContaining(["location", "propertyType", "propertyCondition"]));
  });
  it("etapa 1 NÃO pede contactos", () => {
    const e = validateStep(0, { location: "Faro", propertyType: "Moradia", propertyCondition: "Novo" });
    expect(e).toEqual({});
  });
  it("etapa 3 exige nome, um contacto válido e consentimento", () => {
    const e = validateStep(2, { name: "", consent: false });
    expect(e.name).toBeTruthy();
    expect(e.contact).toBeTruthy();
    expect(e.consent).toBeTruthy();
  });
  it("aceita telefone OU email como contacto", () => {
    expect(validateStep(2, { name: "A", phone: "912345678", consent: true })).toEqual({});
    expect(validateStep(2, { name: "A", email: "a@b.pt", consent: true })).toEqual({});
  });
  it("submissão completa é válida", () => {
    expect(validateSubmission(full)).toEqual({});
  });
});

describe("validadores de contacto", () => {
  it("email", () => { expect(isValidEmail("a@b.pt")).toBe(true); expect(isValidEmail("nope")).toBe(false); });
  it("telefone", () => { expect(isValidPhone("+351 912 345 678")).toBe(true); expect(isValidPhone("12")).toBe(false); });
});

describe("campanhas / UTMs", () => {
  it("extrai utm_* e click ids", () => {
    const u = parseCampaign("?utm_source=meta&utm_medium=cpc&utm_campaign=aval&fbclid=abc&foo=bar");
    expect(u).toEqual({ utm_source: "meta", utm_medium: "cpc", utm_campaign: "aval", fbclid: "abc" });
  });
});

describe("atribuição a consultor", () => {
  it("resolve um id de agente válido", () => { expect(resolveConsultant("ana")).toBe("ana"); });
  it("rejeita ids arbitrários", () => { expect(resolveConsultant("hacker-123")).toBeUndefined(); });
});

describe("deduplicação", () => {
  it("mesma chave para pedidos equivalentes", () => {
    expect(dedupeKey(full)).toBe(dedupeKey({ ...full, name: "  MARIA " }));
  });
});

describe("construção da lead para o Helix", () => {
  it("mapeia origem, suborigem, pipeline e metadados", () => {
    const lead = buildLead({ ...full, utm: { utm_source: "meta" }, ref: "ana", language: "pt" });
    expect(lead.source).toBe("site");
    expect(lead.subSource).toBe("Avaliação de imóvel");
    expect(lead.pipeline).toBe("proprietarios");
    expect(lead.intent).toBe("custos");
    expect(lead.zone).toBe("Faro");
    expect(lead.formVersion).toBe(FORM_VERSION);
    expect(lead.utm).toEqual({ utm_source: "meta" });
    expect(lead.consent?.base).toBe("consentimento");
  });
  it("atribui ao consultor validado (?ref)", () => {
    const lead = buildLead({ ...full, ref: "ana" });
    expect(lead.assignedAgentId).toBe("ana");
    expect(lead.unassigned).toBe(false);
  });
  it("sem ?ref válido → inbox de distribuição", () => {
    const lead = buildLead({ ...full, ref: "invalido" });
    expect(lead.assignedAgentId).toBeUndefined();
    expect(lead.unassigned).toBe(true);
  });
  it("usa telefone como contacto quando não há email", () => {
    const lead = buildLead({ ...full, email: "", phone: "912345678" });
    expect(lead.contact).toBe("912345678");
  });
});
