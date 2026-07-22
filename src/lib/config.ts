import type { OrderingRule } from "./data/ordering";
import type { WatermarkPos } from "./imovel/model";

/**
 * Site configuration that, from Milestone 5, the admin/back office edits and
 * persists (Supabase). For now the default lives here and the /admin page
 * lets you preview a different rule live (guardado no browser).
 */
export const siteConfig = {
  /** Ordering rule for the homepage "Mais imóveis para si" section. */
  homeMoreRule: "recentes" as OrderingRule,
};

/** localStorage key the /admin toggle uses to override the rule per browser. */
export const HOME_RULE_KEY = "housepro:homeMoreRule";

/**
 * Estilo GLOBAL da marca de água. Definido apenas pelo admin da marca em
 * /admin para que todo o site seja consistente — nenhuma agência ou consultor
 * altera tamanho/posição/transparência por imóvel.
 */
export interface WatermarkConfig {
  /** Texto da marca (por defeito a marca). */
  label: string;
  /** Tamanho em % da largura da foto. */
  size: number;
  /** Posição na foto. */
  position: WatermarkPos;
  /** Transparência 0–100 (0 = invisível, 100 = opaco). */
  opacity: number;
}

export const defaultWatermark: WatermarkConfig = {
  label: "HousePro",
  size: 5,
  position: "bottom-right",
  opacity: 85,
};

/** localStorage key para o estilo global da marca de água (protótipo). */
export const WATERMARK_KEY = "housepro:watermark";

/** Lê o estilo global (browser). Só o admin o escreve, mas todos o leem. */
export function readWatermarkConfig(): WatermarkConfig {
  if (typeof window === "undefined") return defaultWatermark;
  try {
    const raw = window.localStorage.getItem(WATERMARK_KEY);
    if (!raw) return defaultWatermark;
    return { ...defaultWatermark, ...(JSON.parse(raw) as Partial<WatermarkConfig>) };
  } catch {
    return defaultWatermark;
  }
}
