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
export const LAST_REVIEWED = "2026-11-20";

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
  /** Rendimento coletável anual do sujeito passivo, excluindo esta venda. */
  rendimentoColetavel?: number;
  rendimentoConjuge?: number;
  tributacaoConjunta?: boolean;
  dependentes?: number;
  /** Confirmações necessárias para aplicar a exclusão de reinvestimento. */
  domicilioFiscal12Meses?: boolean;
  reinvestimentoNoPrazo?: boolean;
  reinvestimentoFundosProprios?: boolean;
  /** Casos especiais seguem para análise fiscal, sem estimativa de imposto. */
  apoioPublicoRelevante?: boolean;
  outroGanhoMesmoAno?: boolean;
  situacaoEspecial?: boolean;
  vptRealizacao?: number;
  dataAquisicao?: string;
  dataVenda?: string;
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

/** Diário da República: Portarias 382/2025/1 e 457/2026/1. Não extrapolar anos futuros. */
const coefficientRows: Record<number, Record<number, number>> = {
  2025: {2000:1.67,2001:1.55,2002:1.49,2003:1.45,2004:1.43,2005:1.40,2006:1.34,2007:1.32,2008:1.28,2009:1.30,2010:1.28,2011:1.24,2012:1.20,2013:1.20,2014:1.20,2015:1.20,2016:1.19,2017:1.18,2018:1.17,2019:1.17,2020:1.17,2021:1.16,2022:1.06,2023:1.02,2024:1},
  2026: {2000:1.71,2001:1.58,2002:1.52,2003:1.48,2004:1.46,2005:1.43,2006:1.37,2007:1.35,2008:1.31,2009:1.33,2010:1.31,2011:1.27,2012:1.23,2013:1.23,2014:1.23,2015:1.23,2016:1.22,2017:1.21,2018:1.20,2019:1.20,2020:1.20,2021:1.19,2022:1.08,2023:1.04,2024:1.02,2025:1},
};
export const COEFICIENTES = { source: "Portaria 457/2026/1", needsVerification: false, byYear: coefficientRows[2026] };
const taxBrackets: Record<number, {limit:number; rate:number}[]> = {
  2025: [{limit:8059,rate:.125},{limit:12160,rate:.16},{limit:17233,rate:.215},{limit:22306,rate:.244},{limit:28400,rate:.314},{limit:41629,rate:.349},{limit:44987,rate:.431},{limit:83696,rate:.446},{limit:Infinity,rate:.48}],
  2026: [{limit:8342,rate:.122},{limit:12587,rate:.152},{limit:17838,rate:.207},{limit:23089,rate:.236},{limit:29397,rate:.306},{limit:43090,rate:.346},{limit:46566,rate:.431},{limit:86634,rate:.446},{limit:Infinity,rate:.48}],
};
function progressiveTax(income:number,year:number) {
  let previous=0,tax=0;
  for(const bracket of taxBrackets[year]??[]) {const slice=Math.max(0,Math.min(income,bracket.limit)-previous);tax+=slice*bracket.rate;previous=bracket.limit;if(income<=bracket.limit)break;}
  return tax;
}

/** Coeficiente para um ano de aquisição (1.00 e nota quando não coberto). */
export function coeficienteFor(anoAquisicao: number, anoVenda: number, notes: string[],dataAquisicao?:string,dataVenda?:string): number {
  // Só se aplica se decorreram mais de 24 meses entre aquisição e venda.
  if(dataAquisicao&&dataVenda){const a=Date.parse(dataAquisicao),v=Date.parse(dataVenda);if(Number.isFinite(a)&&Number.isFinite(v)&&v<=new Date(dataAquisicao).setFullYear(new Date(dataAquisicao).getFullYear()+2))return 1;}
  if (anoVenda - anoAquisicao < 2) return 1;
  if(anoVenda-anoAquisicao===2&&(!dataAquisicao||!dataVenda))notes.push("Precisamos das datas exatas de compra e venda para confirmar se passaram mais de 24 meses.");
  const c = coefficientRows[anoVenda]?.[anoAquisicao];
  if (c == null) {
    notes.push("Coeficiente de desvalorização por confirmar para o ano de aquisição e venda indicados; a estimativa não é definitiva.");
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
  const coeficiente = coeficienteFor(input.anoAquisicao, input.anoVenda, notes,input.dataAquisicao,input.dataVenda);
  if(input.anoVenda!==2025&&input.anoVenda!==2026) {needsAnalysis=true;notes.push("Ano de venda sem tabela fiscal validada: confirme a Portaria e as taxas antes de usar esta estimativa.");}
  if(notes.some(n=>n.includes("Coeficiente de desvalorização por confirmar")))needsAnalysis=true;
  if(notes.some(n=>n.includes("datas exatas")))needsAnalysis=true;

  // Valor de aquisição: em herança/doação usa-se o valor considerado para
  // efeitos de Imposto do Selo (VPT) — o utilizador introduz esse valor.
  if (input.aquisicao === "heranca" || input.aquisicao === "doacao") {
    notes.push("Aquisição por herança/doação: o valor de aquisição corresponde ao valor considerado para Imposto do Selo (VPT) à data. Confirme este valor.");
  }

  const aquisicaoCorrigida = round2(Math.max(0, input.valorAquisicao) * coeficiente * quota);
  const despesasElegiveis = round2(
    input.despesas.reduce((s, d) => s + Math.max(0, d.amount || 0), 0) * quota,
  );
  const realizacao = round2(Math.max(0, input.valorVenda,input.vptRealizacao??0) * quota);
  if((input.vptRealizacao??0)>input.valorVenda)notes.push("Valor de realização baseado no valor superior considerado para IMT; confirmar na escritura/liquidação.");

  const maisValiaBruta = round2(realizacao - aquisicaoCorrigida - despesasElegiveis);
  const menosValia = maisValiaBruta <= 0;

  // Reinvestimento (isenção) — apenas HPP + residente.
  let reinvestimentoFracao = 0;
  if (!menosValia && input.hpp && input.reinvestimento) {
    if (input.residencia !== "residente") {
      needsAnalysis = true;
      notes.push("Reinvestimento por não residente exige análise personalizada.");
    } else if(input.domicilioFiscal12Meses===false||input.reinvestimentoNoPrazo===false||input.reinvestimentoFundosProprios===false){
      needsAnalysis=true;
      notes.push("Os requisitos do reinvestimento não foram confirmados; exclusão não aplicada.");
    } else if(input.domicilioFiscal12Meses!==true||input.reinvestimentoNoPrazo!==true||input.reinvestimentoFundosProprios!==true){
      needsAnalysis=true;
      notes.push("Reinvestimento provisório: confirme domicílio fiscal nos 12 meses, prazo de 24 meses antes/36 meses depois, capitais próprios e declaração em IRS.");
      const aReinvestir=Math.max(0,realizacao-Math.max(0,input.divida??0));
      reinvestimentoFracao=aReinvestir>0?Math.min(1,Math.max(0,input.valorReinvestido??0)/aReinvestir):0;
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

  if(input.apoioPublicoRelevante||input.outroGanhoMesmoAno||input.situacaoEspecial){needsAnalysis=true;notes.push("Caso especial ou outros ganhos no mesmo ano: análise fiscal individual necessária.");}
  // Diferença de coleta com e sem a venda; deduções, mínimo de existência,
  // taxa de solidariedade e outros regimes especiais não estão incluídos.
  let impostoEstimado: number | null = null;
  if (!menosValia && input.residencia === "residente" && !needsAnalysis && taxBrackets[input.anoVenda] && typeof input.rendimentoColetavel === "number") {
    const base=Math.max(0,input.rendimentoColetavel)+(input.tributacaoConjunta?Math.max(0,input.rendimentoConjuge??0):0);
    const tax=(x:number)=>input.tributacaoConjunta?2*progressiveTax(x/2,input.anoVenda):progressiveTax(x,input.anoVenda);
    impostoEstimado=round2(tax(base+baseTributavel)-tax(base));
    notes.push("Variação indicativa de coleta (com e sem esta venda); não inclui deduções, mínimo de existência, solidariedade nem outras situações do agregado.");
  } else if (!menosValia && input.residencia === "residente" && !needsAnalysis && typeof input.taxaMarginalEstimada === "number") {
    impostoEstimado = round2(baseTributavel * input.taxaMarginalEstimada);
    notes.push("Taxa marginal indicada pelo utilizador: aproximação linear, não é a liquidação do IRS.");
  } else if (!menosValia) {
    notes.push("Imposto final não estimado: depende dos restantes rendimentos, agregado familiar e regras aplicáveis ao seu caso.");
  }

  if (menosValia) notes.push("A operação resulta em menos-valia — sem imposto; pode ser reportada em IRS.");
  if(reinvestimentoFracao>0&&reinvestimentoFracao<1)notes.push("Reinvestimento parcial: exclusão proporcional, sujeita à confirmação dos requisitos.");
  if(input.dependentes)notes.push("Dependentes registados para enquadramento; deduções por dependentes não foram consideradas no valor da variação de coleta.");

  return {
    engineVersion: ENGINE_VERSION,
    fiscalYear: input.anoVenda,
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
