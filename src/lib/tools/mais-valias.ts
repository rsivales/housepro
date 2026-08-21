/**
 * Mais-valias imobiliárias (IRS) — cálculo INDICATIVO para residentes.
 *
 * Modelo (regra geral, residentes):
 *   mais-valia = valor de realização (venda)
 *              − valor de aquisição × coeficiente de desvalorização monetária
 *              − encargos com valorização (últimos 12 anos)
 *              − despesas de compra e venda (IMT, escritura, registo, comissão,
 *                certificado energético)
 *
 * Para residentes, só 50% da mais-valia é tributável (englobamento obrigatório),
 * sendo depois somada ao restante rendimento e tributada às taxas progressivas
 * de IRS. Há isenção quando o imóvel é habitação própria e permanente (HPP) e o
 * valor é reinvestido noutra HPP, dentro dos prazos legais.
 *
 * É uma ESTIMATIVA — não substitui o apuramento oficial nas Finanças. O
 * coeficiente de desvalorização e a taxa marginal de IRS dependem do caso.
 */

export interface MaisValiasInput {
  /** Valor de venda (realização). */
  venda: number;
  /** Valor de aquisição (compra). */
  aquisicao: number;
  /** Coeficiente de desvalorização monetária (Portaria anual). 1 = sem correção. */
  coeficiente: number;
  /** Despesas de compra e venda dedutíveis (IMT, escritura, registo, comissão, CE). */
  despesas: number;
  /** Encargos com valorização do imóvel (obras nos últimos 12 anos). */
  encargos: number;
  /** Fração tributável (residente: 0,5). */
  fracaoTributavel: number;
  /** Isenção por reinvestimento em habitação própria e permanente. */
  reinvestimento: boolean;
  /** Taxa marginal de IRS aplicável (0–1). */
  taxaMarginal: number;
}

export interface MaisValiasResultado {
  aquisicaoCorrigida: number;
  maisValia: number;
  /** Verdadeiro quando o resultado é negativo (menos-valia). */
  menosValia: boolean;
  baseTributavel: number;
  imposto: number;
  /** Imposto / mais-valia bruta. */
  taxaEfetiva: number;
}

/** Taxas marginais de IRS 2026 (continente) — indicativas para o englobamento. */
export const TAXAS_MARGINAIS_IRS: { label: string; rate: number }[] = [
  { label: "13,0% (1.º escalão)", rate: 0.13 },
  { label: "16,5% (2.º escalão)", rate: 0.165 },
  { label: "22,0% (3.º escalão)", rate: 0.22 },
  { label: "25,0% (4.º escalão)", rate: 0.25 },
  { label: "32,0% (5.º escalão)", rate: 0.32 },
  { label: "35,5% (6.º escalão)", rate: 0.355 },
  { label: "43,5% (7.º escalão)", rate: 0.435 },
  { label: "45,0% (8.º escalão)", rate: 0.45 },
  { label: "48,0% (9.º escalão)", rate: 0.48 },
];

export function calcularMaisValias(input: MaisValiasInput): MaisValiasResultado {
  const aquisicaoCorrigida = Math.max(0, input.aquisicao) * (input.coeficiente || 1);
  const maisValia =
    Math.max(0, input.venda) -
    aquisicaoCorrigida -
    Math.max(0, input.despesas) -
    Math.max(0, input.encargos);

  const menosValia = maisValia <= 0;
  // Reinvestimento em HPP → isenção (modelo indicativo: isenção total).
  const baseTributavel = menosValia || input.reinvestimento
    ? 0
    : maisValia * input.fracaoTributavel;
  const imposto = baseTributavel * input.taxaMarginal;
  const taxaEfetiva = maisValia > 0 ? imposto / maisValia : 0;

  return { aquisicaoCorrigida, maisValia, menosValia, baseTributavel, imposto, taxaEfetiva };
}
