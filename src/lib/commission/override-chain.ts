import {
  DEFAULT_SPLIT,
  maxOverrideDepth,
  overrideForLevel,
  type SplitConfig,
} from "./split";

/**
 * Distribuição do override de rede quando um negócio fecha: dada a comissão
 * bruta e a cadeia de padrinhos (do direto para cima), calcula quanto cada um
 * recebe. Pura e testável.
 */

export interface UplineMember {
  id: string;
  name?: string;
}

export interface OverridePayout {
  agentId: string;
  agentName?: string;
  /** Nível de afiliação (1 = padrinho direto). */
  level: number;
  pct: number;
  amount: number;
}

/**
 * @param gross  comissão bruta do negócio (€).
 * @param upline padrinhos por ordem: [direto (nível 1), avô (nível 2), …].
 */
export function overrideChain(
  gross: number,
  upline: UplineMember[],
  cfg: SplitConfig = DEFAULT_SPLIT
): OverridePayout[] {
  const depth = maxOverrideDepth(cfg);
  return upline.slice(0, depth).map((s, i) => {
    const level = i + 1;
    return {
      agentId: s.id,
      agentName: s.name,
      level,
      pct: cfg.overrideTiers[i] ?? 0,
      amount: overrideForLevel(gross, level, cfg),
    };
  });
}

/** Total de override pago pela cadeia (€). */
export function overrideChainTotal(payouts: OverridePayout[]): number {
  return payouts.reduce((s, p) => s + p.amount, 0);
}
