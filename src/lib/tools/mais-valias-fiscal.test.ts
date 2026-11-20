import { describe, it, expect } from "vitest";

import { calcularMaisValias, coeficienteFor, ENGINE_VERSION, type MaisValiasInput } from "./mais-valias-fiscal";

const base: MaisValiasInput = {
  valorAquisicao: 180000, anoAquisicao: 2016, valorVenda: 320000, anoVenda: 2026,
  quota: 100, aquisicao: "compra",
  despesas: [{ label: "IMT", amount: 8000 }, { label: "Comissão", amount: 12000 }],
  residencia: "residente", hpp: false, reinvestimento: false,
};

describe("motor fiscal — mais-valias", () => {
  it("venda com ganho: aquisição corrigida, base 50% e versão", () => {
    const r = calcularMaisValias(base);
    // Portaria 457/2026/1: 2016 → 1,22.
    expect(r.aquisicaoCorrigida).toBe(219600);
    expect(r.maisValiaBruta).toBe(320000 - 219600 - 20000);
    expect(r.baseTributavel).toBe(r.maisValiaBruta * 0.5);
    expect(r.menosValia).toBe(false);
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(r.impostoEstimado).toBeNull(); // sem taxa marginal
  });

  it("estima imposto quando há taxa marginal (residente)", () => {
    const r = calcularMaisValias({ ...base, taxaMarginalEstimada: 0.35 });
    expect(r.impostoEstimado).toBe(r.baseTributavel * 0.35);
  });

  it("venda com perda → menos-valia, sem imposto", () => {
    const r = calcularMaisValias({ ...base, valorVenda: 150000 });
    expect(r.menosValia).toBe(true);
    expect(r.baseTributavel).toBe(0);
    expect(r.impostoEstimado).toBeNull();
  });

  it("percentagem parcial de propriedade reduz proporcionalmente", () => {
    const full = calcularMaisValias(base);
    const half = calcularMaisValias({ ...base, quota: 50 });
    expect(half.maisValiaBruta).toBeCloseTo(full.maisValiaBruta / 2, 1);
  });

  it("coeficiente não se aplica se < 24 meses", () => {
    const r = calcularMaisValias({ ...base, anoAquisicao: 2025, anoVenda: 2026 });
    expect(r.coeficiente).toBe(1);
  });

  it("ano de aquisição fora da tabela → coeficiente 1 e nota", () => {
    const notes: string[] = [];
    expect(coeficienteFor(1990, 2026, notes)).toBe(1);
    expect(notes.join(" ")).toMatch(/por confirmar/i);
  });

  it("reinvestimento total (HPP, residente) isenta a mais-valia", () => {
    const r = calcularMaisValias({ ...base, hpp: true, reinvestimento: true, valorReinvestido: 320000 });
    expect(r.reinvestimentoFracao).toBe(1);
    expect(r.baseTributavel).toBe(0);
  });

  it("reinvestimento parcial isenta só a proporção", () => {
    const r = calcularMaisValias({ ...base, hpp: true, reinvestimento: true, valorReinvestido: 160000 });
    expect(r.reinvestimentoFracao).toBeCloseTo(0.5, 2);
    expect(r.baseTributavel).toBeGreaterThan(0);
    expect(r.notes.join(" ")).toMatch(/parcial/i);
  });

  it("desconta a dívida ao valor a reinvestir", () => {
    const r = calcularMaisValias({ ...base, hpp: true, reinvestimento: true, divida: 120000, valorReinvestido: 200000 });
    // a reinvestir = 320000 - 120000 = 200000 → fração 1
    expect(r.reinvestimentoFracao).toBe(1);
  });

  it("herança/doação adiciona nota sobre VPT", () => {
    const r = calcularMaisValias({ ...base, aquisicao: "heranca" });
    expect(r.notes.join(" ")).toMatch(/VPT|Imposto do Selo/i);
  });

  it("não residente → needsAnalysis e sem imposto final", () => {
    const r = calcularMaisValias({ ...base, residencia: "nao_residente", taxaMarginalEstimada: 0.35 });
    expect(r.needsAnalysis).toBe(true);
    expect(r.impostoEstimado).toBeNull();
  });

  it("arredonda a 2 casas", () => {
    const r = calcularMaisValias({ ...base, valorAquisicao: 180000.333 });
    expect(Number.isInteger(r.aquisicaoCorrigida * 100)).toBe(true);
  });
  it("usa a tabela de 2025 apenas para venda em 2025",()=>{
    expect(coeficienteFor(2016,2025,[])).toBe(1.19);
    expect(coeficienteFor(2016,2026,[])).toBe(1.22);
  });
  it("calcula a variação de coleta com quociente conjugal, sem aplicar taxa marginal simples",()=>{
    const single=calcularMaisValias({...base,rendimentoColetavel:30000});
    const joint=calcularMaisValias({...base,rendimentoColetavel:30000,rendimentoConjuge:30000,tributacaoConjunta:true});
    expect(single.impostoEstimado).not.toBeNull();expect(joint.impostoEstimado).not.toBeNull();
    expect(joint.impostoEstimado).toBeLessThan(single.impostoEstimado!);
  });
  it("não estima imposto com coeficiente desconhecido ou condição especial",()=>{
    expect(calcularMaisValias({...base,anoVenda:2027,rendimentoColetavel:30000}).impostoEstimado).toBeNull();
    expect(calcularMaisValias({...base,rendimentoColetavel:30000,apoioPublicoRelevante:true}).impostoEstimado).toBeNull();
  });
});
