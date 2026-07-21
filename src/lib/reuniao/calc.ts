/**
 * Reunião Uau — camada de cálculo (funções PURAS).
 *
 * Regra de arquitetura: os cálculos vivem AQUI, nunca dentro dos componentes
 * visuais. Os componentes recebem apenas os resultados já calculados.
 *
 * Todos os valores são ESTIMATIVAS. As tabelas fiscais (IMT/Selo) são do
 * Continente e devem ser confirmadas/atualizadas ao ano em vigor.
 */

export interface CalcLine {
  label: string;
  value: number;
  kind?: "money" | "percent" | "number";
  emphasis?: boolean;
}

// ── IMT (Continente) ──────────────────────────────────────────────
// Escalões marginais: [limite superior, taxa, parcela a abater].
type Bracket = [max: number, rate: number, abate: number];

const IMT_HPP: Bracket[] = [
  [101917, 0, 0],
  [139412, 0.02, 2038.34],
  [190086, 0.05, 6220.7],
  [316772, 0.07, 10022.42],
  [633453, 0.08, 13190.14],
  [1102920, 0.06, 0], // taxa única 6%
  [Infinity, 0.075, 0], // taxa única 7,5%
];

const IMT_SECUNDARIA: Bracket[] = [
  [101917, 0.01, 0],
  [139412, 0.02, 1019.17],
  [190086, 0.05, 5202.54],
  [316772, 0.07, 9004.26],
  [607528, 0.08, 12171.98],
  [1102920, 0.06, 0],
  [Infinity, 0.075, 0],
];

export function computeIMT(
  value: number,
  tipo: "hpp" | "secundaria" = "hpp"
): number {
  if (value <= 0) return 0;
  const table = tipo === "hpp" ? IMT_HPP : IMT_SECUNDARIA;
  for (const [max, rate, abate] of table) {
    if (value <= max) {
      return Math.max(0, value * rate - abate);
    }
  }
  return 0;
}

/** Imposto do Selo na aquisição: 0,8% sobre o valor. */
export function computeSelo(value: number): number {
  return Math.max(0, value * 0.008);
}

/** Estimativa de custos de escritura + registo predial. */
export function estimateEscritura(): number {
  return 1200;
}

/** Prestação mensal (anuidade) a partir de capital, TAN anual e prazo (anos). */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  years: number
): number {
  if (principal <= 0 || years <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  const n = years * 12;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// ── COMPRADOR ─────────────────────────────────────────────────────
export interface CompradorInput {
  precoImovel: number;
  capitalProprio: number;
  taxa: number; // TAN %
  prazo: number; // anos
  tipoImt?: "hpp" | "secundaria";
}

export function computeComprador(inp: CompradorInput): CalcLine[] {
  const preco = Math.max(0, inp.precoImovel);
  const financiamentoMax = preco * 0.9;
  const financiamento = Math.max(
    0,
    Math.min(preco - inp.capitalProprio, financiamentoMax)
  );
  const entrada = preco - financiamento;
  const imt = computeIMT(preco, inp.tipoImt ?? "hpp");
  const selo = computeSelo(preco);
  const escritura = estimateEscritura();
  const custos = imt + selo + escritura;
  const prestacao = monthlyPayment(financiamento, inp.taxa, inp.prazo);
  const total = entrada + custos;

  return [
    { label: "Entrada necessária", value: entrada, kind: "money" },
    { label: "IMT", value: imt, kind: "money" },
    { label: "Imposto do Selo", value: selo, kind: "money" },
    { label: "Escritura e registo (estim.)", value: escritura, kind: "money" },
    { label: "Financiamento", value: financiamento, kind: "money" },
    { label: "Prestação mensal estimada", value: prestacao, kind: "money" },
    {
      label: "Total necessário para avançar",
      value: total,
      kind: "money",
      emphasis: true,
    },
  ];
}

// ── VENDEDOR ──────────────────────────────────────────────────────
export interface VendedorInput {
  valorEsperado: number;
  comissaoPct: number; // % sobre o valor
  creditoEmDivida: number;
  valorAquisicao: number; // para mais-valias
  despesasVenda: number; // cert. energético, etc.
}

export function computeVendedor(inp: VendedorInput): CalcLine[] {
  const valor = Math.max(0, inp.valorEsperado);
  const comissao = valor * (inp.comissaoPct / 100);
  const iva = comissao * 0.23;
  const comissaoComIva = comissao + iva;
  // Mais-valias (estimativa simplificada): 50% da mais-valia tributada a 28%.
  const maisValia = Math.max(0, valor - inp.valorAquisicao - inp.despesasVenda);
  const impostoMaisValias = maisValia * 0.5 * 0.28;
  const liquido =
    valor - comissaoComIva - inp.creditoEmDivida - inp.despesasVenda - impostoMaisValias;

  return [
    { label: "Comissão", value: comissao, kind: "money" },
    { label: "IVA da comissão (23%)", value: iva, kind: "money" },
    { label: "Crédito em dívida", value: inp.creditoEmDivida, kind: "money" },
    { label: "Custos de venda (estim.)", value: inp.despesasVenda, kind: "money" },
    { label: "Imposto s/ mais-valias (estim.)", value: impostoMaisValias, kind: "money" },
    {
      label: "Valor líquido estimado a receber",
      value: liquido,
      kind: "money",
      emphasis: true,
    },
  ];
}

// ── INVESTIDOR ────────────────────────────────────────────────────
export interface InvestidorInput {
  preco: number;
  obras: number;
  capitalProprio: number;
  taxa: number;
  prazo: number;
  rendaMensal: number;
  vacancyPct: number; // % de vacância anual
  despesasAnuais: number; // condomínio + IMI + seguros + manutenção + gestão
  tipoImt?: "hpp" | "secundaria";
}

export interface InvestidorResult {
  lines: CalcLine[];
  cenarios: { nome: string; yieldLiquida: number; cashFlow: number }[];
}

export function computeInvestidor(inp: InvestidorInput): InvestidorResult {
  const custosAquisicao =
    computeIMT(inp.preco, inp.tipoImt ?? "secundaria") +
    computeSelo(inp.preco) +
    estimateEscritura();
  const investimentoTotal = inp.preco + custosAquisicao + inp.obras;

  const receitaBruta = inp.rendaMensal * 12;
  const receitaEfetiva = receitaBruta * (1 - inp.vacancyPct / 100);
  const noi = receitaEfetiva - inp.despesasAnuais; // resultado operacional líquido

  const financiamento = Math.max(0, inp.preco - inp.capitalProprio);
  const servicoDivida = monthlyPayment(financiamento, inp.taxa, inp.prazo) * 12;
  const cashFlow = noi - servicoDivida;

  const yieldBruta = investimentoTotal > 0 ? receitaBruta / investimentoTotal : 0;
  const yieldLiquida = investimentoTotal > 0 ? noi / investimentoTotal : 0;
  const capitalInvestido = inp.capitalProprio + custosAquisicao + inp.obras;
  const roe = capitalInvestido > 0 ? cashFlow / capitalInvestido : 0;

  const cenario = (nome: string, f: number) => {
    const rEf = receitaBruta * f * (1 - inp.vacancyPct / 100);
    const noiC = rEf - inp.despesasAnuais;
    return {
      nome,
      yieldLiquida: investimentoTotal > 0 ? noiC / investimentoTotal : 0,
      cashFlow: noiC - servicoDivida,
    };
  };

  return {
    lines: [
      { label: "Custos de aquisição (estim.)", value: custosAquisicao, kind: "money" },
      { label: "Investimento total", value: investimentoTotal, kind: "money" },
      { label: "Receita anual estimada", value: receitaBruta, kind: "money" },
      { label: "Despesas anuais", value: inp.despesasAnuais, kind: "money" },
      { label: "Yield bruta", value: yieldBruta, kind: "percent" },
      { label: "Yield líquida", value: yieldLiquida, kind: "percent" },
      { label: "Cash-flow anual", value: cashFlow, kind: "money", emphasis: true },
      { label: "Retorno s/ capital próprio (ROE)", value: roe, kind: "percent" },
    ],
    cenarios: [
      cenario("Conservador", 0.9),
      cenario("Base", 1),
      cenario("Otimista", 1.1),
    ],
  };
}
