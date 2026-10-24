/**
 * Motor de estimativa de mais-valias imobiliárias (IRS) — camada independente,
 * testável e versionada por ano fiscal.
 *
 * NATUREZA: estimativa meramente indicativa. Não substitui aconselhamento
 * fiscal/contabilístico/jurídico nem a liquidação oficial da Autoridade
 * Tributária. Quando uma situação não pode ser tratada com segurança, o motor
 * NÃO inventa: marca `needsAnalysis` e devolve apenas o que consegue apurar.
 *
 * FONTES OFICIAIS (a confirmar/atualizar a cada ano):
 *  - Código do IRS (CIRS), artigos 9.º, 10.º, 43.º, 44.º, 50.º, 51.º
 *    (mais-valias, valor de aquisição/realização, coeficiente, encargos,
 *    reinvestimento em habitação própria e permanente).
 *  - Portaria anual dos coeficientes de desvalorização da moeda.
 *  - Portal das Finanças (informacaofiscal) e Diário da República.
 *
 * IMPORTANTE: os coeficientes abaixo são um CONJUNTO INDICATIVO e devem ser
 * substituídos pelos valores da Portaria em vigor (ver `COEFICIENTES.source`).
 */

export const FISCAL_YEAR = 2026;
export const ENGINE_VERSION = "mv-fiscal-2026.2";
export const LAST_REVIEWED = "2026-10-24";

export const SOURCES = [
  "Código do IRS (CIRS) — art. 9.º, 10.º, 43.º, 44.º, 50.º e 51.º",
  "Portaria anual dos coeficientes de desvalorização da moeda",
  "Portal das Finanças (Autoridade Tributária)",
  "Diário da República",
] as const;

export type Aquisicao = "compra" | "heranca" | "doacao" | "outro";
export type Residencia = "residente" | "nao_residente";

export interface DespesaItem {
  /** Rótulo (IMT, Selo, escritura, registo, comissão, CE, obras, outra). */
  label: string;
  amount: number;
  year?: number;
  /** Existe comprovativo? (relevante para dedutibilidade). */
  hasProof?: boolean;
}

export interface MaisValiasInput {
  // Etapa 1 — Imóvel
  valorAquisicao: number;
  anoAquisicao: number;
  valorVenda: number;
  anoVenda: number;
  /** Percentagem de propriedade (0–100). */
  quota: number;
  aquisicao: Aquisicao;
  // Etapa 2 — Despesas (lista) e encargos
  despesas: DespesaItem[];
  // Etapa 3 — Situação fiscal
  residencia: Residencia;
  hpp: boolean; // habitação própria e permanente
  reinvestimento: boolean;
  valorReinvestido?: number;
  /** Empréstimo em dívida do imóvel vendido (abate ao valor a reinvestir). */
  divida?: number;
  /** Taxa marginal de IRS estimada (0–1), opcional — só para estimar imposto. */
  taxaMarginalEstimada?: number;
}

export interface MaisValiasResult {
  engineVersion: string;
  fiscalYear: number;
  coeficiente: number;
  aquisicaoCorrigida: number;
  despesasElegiveis: number;
  maisValiaBruta: number;
  menosValia: boolean;
  /** Fração de reinvestimento aplicada (0–1). */
  reinvestimentoFracao: number;
  /** Base potencialmente sujeita a tributação (após 50% residentes). */
  baseTributavel: number;
  /** Estimativa de imposto — null quando não há dados suficientes. */
  impostoEstimado: number | null;
  /** Situações que exigem análise personalizada. */
  needsAnalysis: boolean;
  notes: string[];
}

/**
 * Coeficientes de desvalorização da moeda por ANO DE AQUISIÇÃO.
 * CONJUNTO INDICATIVO — substituir pela Portaria em vigor antes de produção.
 */
export const COEFICIENTES: { source: string; needsVerification: boolean; byYear: Record<number, number> } = {
  source: "Portaria n.º 457/2026/1, de 15 de outubro (alienações em 2026)",
  needsVerification: false,
  byYear: {
    2000:1.71,2001:1.58,2002:1.52,2003:1.48,2004:1.46,
    2005:1.43,2006:1.37,2007:1.35,2008:1.31,2009:1.33,
    2010:1.31,2011:1.27,2012:1.23,2013:1.23,2014:1.23,2015:1.23,
    2016:1.22,2017:1.21,2018:1.20,2019:1.20,2020:1.20,
    2021:1.19,2022:1.08,2023:1.04,2024:1.02,2025:1.00,2026:1.00,
  },
};

/** Coeficiente para um ano de aquisição (1.00 e nota quando não coberto). */
export function coeficienteFor(anoAquisicao: number, anoVenda: number, notes: string[]): number {
  // Só se aplica se decorreram mais de 24 meses entre aquisição e venda.
  if (anoVenda - anoAquisicao < 2) return 1;
  const c = COEFICIENTES.byYear[anoAquisicao];
  if (c == null) {
    notes.push("Coeficiente de desvalorização por confirmar para o ano de aquisição indicado.");
    return 1;
  }
  return c;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula a estimativa de mais-valias. Para residentes, 50% da mais-valia é
 * tributável (englobamento). O imposto final depende dos restantes rendimentos
 * — só é estimado quando fornecida uma taxa marginal.
 */
export function calcularMaisValias(input: MaisValiasInput): MaisValiasResult {
  const notes: string[] = [];
  let needsAnalysis = false;

  const quota = Math.min(1, Math.max(0, (input.quota || 100) / 100));
  if (input.anoVenda !== FISCAL_YEAR) { needsAnalysis = true; notes.push("Tabela de coeficientes validada apenas para vendas em 2026. Ano de venda diferente: requer análise fiscal."); }
  if (input.anoAquisicao < 2000) { needsAnalysis = true; notes.push("Aquisições anteriores a 2000 exigem consulta da tabela integral da Portaria."); }
  if (input.anoVenda - input.anoAquisicao === 2) { needsAnalysis = true; notes.push("Confirmar datas exatas: o coeficiente só se aplica após mais de 24 meses."); }
  if (input.despesas.some(d => !d.hasProof)) { needsAnalysis = true; notes.push("Despesas sem comprovativos confirmados: dedutibilidade sujeita a validação."); }
  const coeficiente = input.anoVenda === FISCAL_YEAR ? coeficienteFor(input.anoAquisicao, input.anoVenda, notes) : 1;

  // Valor de aquisição: em herança/doação usa-se o valor considerado para
  // efeitos de Imposto do Selo (VPT) — o utilizador introduz esse valor.
  if (input.aquisicao === "heranca" || input.aquisicao === "doacao") {
    notes.push("Aquisição por herança/doação: o valor de aquisição corresponde ao valor considerado para Imposto do Selo (VPT) à data. Confirme este valor.");
  }

  const aquisicaoCorrigida = round2(Math.max(0, input.valorAquisicao) * coeficiente * quota);
  const despesasElegiveis = round2(
    input.despesas.reduce((s, d) => s + Math.max(0, d.amount || 0), 0) * quota,
  );
  const realizacao = round2(Math.max(0, input.valorVenda) * quota);

  const maisValiaBruta = round2(realizacao - aquisicaoCorrigida - despesasElegiveis);
  const menosValia = maisValiaBruta <= 0;

  // Reinvestimento (isenção) — apenas HPP + residente.
  let reinvestimentoFracao = 0;
  if (!menosValia && input.hpp && input.reinvestimento) {
    if (input.residencia !== "residente") {
      needsAnalysis = true;
      notes.push("Reinvestimento por não residente exige análise personalizada.");
    } else {
      const aReinvestir = Math.max(0, realizacao - Math.max(0, input.divida ?? 0));
      const reinvestido = Math.max(0, input.valorReinvestido ?? 0);
      reinvestimentoFracao = aReinvestir > 0 ? Math.min(1, reinvestido / aReinvestir) : 0;
      if (reinvestimentoFracao > 0 && reinvestimentoFracao < 1) {
        notes.push("Reinvestimento parcial: a isenção aplica-se apenas à proporção reinvestida.");
      }
    }
  }

  const maisValiaTributavel = round2(maisValiaBruta * (1 - reinvestimentoFracao));

  // Fração tributável: residentes 50% (englobamento).
  const fracao = 0.5;
  if (input.residencia === "nao_residente") {
    // Regras de não residentes (e UE/EEE) variam — marcar para análise.
    needsAnalysis = true;
    notes.push("Não residente: o regime aplicável (incl. UE/EEE) exige análise personalizada. Apresentamos apenas a mais-valia estimada.");
  }

  const baseTributavel = menosValia ? 0 : round2(maisValiaTributavel * fracao);

  // Imposto só quando residente + taxa marginal fornecida.
  let impostoEstimado: number | null = null;
  if (!menosValia && !needsAnalysis && input.residencia === "residente" && typeof input.taxaMarginalEstimada === "number") {
    impostoEstimado = round2(baseTributavel * input.taxaMarginalEstimada);
  } else if (!menosValia) {
    notes.push("Imposto final não estimado: depende dos restantes rendimentos, agregado familiar e regras aplicáveis ao seu caso.");
  }

  if (menosValia) notes.push("A operação resulta em menos-valia — sem imposto; pode ser reportada em IRS.");
  if (COEFICIENTES.needsVerification) notes.push("Coeficientes de desvalorização a confirmar com a Portaria em vigor.");

  return {
    engineVersion: ENGINE_VERSION,
    fiscalYear: FISCAL_YEAR,
    coeficiente,
    aquisicaoCorrigida,
    despesasElegiveis,
    maisValiaBruta,
    menosValia,
    reinvestimentoFracao,
    baseTributavel,
    impostoEstimado,
    needsAnalysis,
    notes,
  };
}
