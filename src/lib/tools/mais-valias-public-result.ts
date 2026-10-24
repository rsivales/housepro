import type { MaisValiasResult } from "@/lib/tools/mais-valias-fiscal";
import type { MvSubmission } from "@/lib/tools/mais-valias-funnel";

/**
 * Public, serializable projection of a simulation.
 * IMPORTANT: Do not fabricate three tax amounts from a single marginal rate.
 * Tax scenarios require a reviewed progressive-tax model and household income.
 */
export type PublicCapitalGainsResult = {
  fiscalYear: number;
  acquisitionValue: number;
  saleValue: number;
  adjustedAcquisition: number;
  eligibleExpenses: number;
  capitalGain: number;
  taxableBase: number;
  estimatedTax: number | null;
  scenarios: { optimistic: number | null; balanced: number | null; conservative: number | null };
  confidence: "requires_review" | "indicative";
  notes: string[];
  disclaimer: string;
};

export function toPublicCapitalGainsResult(
  submission: MvSubmission,
  result: MaisValiasResult,
): PublicCapitalGainsResult {
  return {
    fiscalYear: result.fiscalYear,
    acquisitionValue: Number(submission.valorAquisicao?.replace(/\./g, "").replace(",", ".") || 0),
    saleValue: Number(submission.valorVenda?.replace(/\./g, "").replace(",", ".") || 0),
    adjustedAcquisition: result.aquisicaoCorrigida,
    eligibleExpenses: result.despesasElegiveis,
    capitalGain: result.maisValiaBruta,
    taxableBase: result.baseTributavel,
    estimatedTax: result.needsAnalysis ? null : result.impostoEstimado ?? null,
    scenarios: { optimistic: null, balanced: null, conservative: null },
    confidence: result.needsAnalysis ? "requires_review" : "indicative",
    notes: result.notes,
    disclaimer: "Estimativa indicativa. O IRS final depende dos rendimentos, situação fiscal, reinvestimento e legislação aplicável. Os três cenários fiscais só serão exibidos após validação do respetivo motor de cálculo.",
  };
}
