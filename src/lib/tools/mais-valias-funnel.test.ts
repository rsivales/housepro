import { describe, it, expect } from "vitest";

import {
  validateStep, validateSubmission, toEngineInput, buildLead, buildEmailReport,
  summarizeForLead, runSimulation, dedupeKey, type MvSubmission,
} from "./mais-valias-funnel";
import { ENGINE_VERSION, FISCAL_YEAR } from "./mais-valias-fiscal";

const full: MvSubmission = {
  valorAquisicao: "180000", anoAquisicao: "2016", valorVenda: "320000", anoVenda: "2026",
  quota: "100", aquisicao: "compra",
  imt: "8000", comissao: "12000",
  residencia: "residente",
  name: "Maria", email: "maria@example.com", consent: true,
};

describe("funil — validação", () => {
  it("etapa 1 exige valores e datas", () => {
    const e = validateStep(0, {});
    expect(Object.keys(e)).toEqual(expect.arrayContaining(["valorAquisicao", "valorVenda", "anoAquisicao", "anoVenda", "aquisicao"]));
  });
  it("etapa 4 exige nome, e-mail válido e consentimento", () => {
    const e = validateStep(3, { name: "", email: "x", consent: false });
    expect(e.name).toBeTruthy(); expect(e.email).toBeTruthy(); expect(e.consent).toBeTruthy();
  });
  it("e-mail é obrigatório (resultado vai por e-mail)", () => {
    expect(validateStep(3, { name: "A", phone: "912345678", consent: true }).email).toBeTruthy();
    expect(validateStep(3, { name: "A", email: "a@b.pt", consent: true })).toEqual({});
  });
  it("submissão completa válida", () => { expect(validateSubmission(full)).toEqual({}); });
});

describe("funil — motor e input", () => {
  it("assembla despesas > 0 e ignora vazias", () => {
    const inp = toEngineInput(full);
    expect(inp.despesas.map((d) => d.label)).toEqual(["IMT", "Comissão de mediação"]);
    expect(inp.valorAquisicao).toBe(180000);
  });
  it("aceita números com vírgula e símbolos", () => {
    expect(toEngineInput({ ...full, valorVenda: "320.000,50 €" }).valorVenda).toBeCloseTo(320000.5, 1);
  });
  it("corre a simulação", () => {
    const r = runSimulation(full);
    expect(r.menosValia).toBe(false);
    expect(r.fiscalYear).toBe(FISCAL_YEAR);
  });
});

describe("funil — lead (dados mínimos, sem financeiros)", () => {
  it("mapeia origem/suborigem/pipeline e NÃO inclui euros no resumo", () => {
    const r = runSimulation(full);
    const lead = buildLead({ ...full, utm: { utm_source: "facebook" } }, r, "pendente");
    expect(lead.source).toBe("site");
    expect(lead.subSource).toBe("Calculadora de mais-valias");
    expect(lead.pipeline).toBe("proprietarios");
    expect(lead.formVersion).toBe(ENGINE_VERSION);
    expect(lead.emailStatus).toBe("pendente");
    expect(lead.utm).toEqual({ utm_source: "facebook" });
    // Sem valores financeiros na lead (sem euros nem montantes):
    expect(lead.message ?? "").not.toMatch(/€/);
    expect(lead.message ?? "").not.toContain("180000");
    expect(lead.message ?? "").not.toContain("320000");
  });
  it("resumo indica mais-valia vs menos-valia", () => {
    const r = runSimulation({ ...full, valorVenda: "150000" });
    expect(summarizeForLead({ ...full, valorVenda: "150000" }, r)).toMatch(/menos-valia/i);
  });
});

describe("funil — relatório por e-mail (valores só aqui)", () => {
  it("assunto correto e inclui base tributável e nota legal", () => {
    const r = runSimulation(full);
    const { subject, text } = buildEmailReport(full, r);
    expect(subject).toBe("A sua simulação de mais-valias imobiliárias");
    expect(text).toMatch(/Base potencialmente sujeita a tributação/);
    expect(text).toMatch(/não substitui aconselhamento fiscal/i);
    expect(text).toMatch(new RegExp(String(FISCAL_YEAR)));
  });
});

describe("funil — dedupe", () => {
  it("mesma chave para reenvio equivalente", () => {
    expect(dedupeKey(full)).toBe(dedupeKey({ ...full, name: "outro" }));
  });
});
