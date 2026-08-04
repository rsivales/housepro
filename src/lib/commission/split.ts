/**
 * Repartição da comissão (waterfall) + override de afiliação ("padrinhos").
 *
 * Funções puras e PARAMETRIZÁVEIS — as percentagens são configuração, não estão
 * fixas no código, para o negócio as afinar sem risco. A regra de ouro: a soma
 * de todas as fatias é SEMPRE igual à comissão bruta (nunca ultrapassa 100%).
 *
 * Waterfall sobre a comissão bruta do agente produtor (100%):
 *   1. Royalties da marca .......... royaltiesPct   (ex.: 3%)
 *   2. Agência ..................... agencyPct       (ex.: 3%)
 *   3. Fundo de reforma do agente .. retirementPct   (ex.: 2%)
 *   4. Override de afiliação ....... até overrideTiers (ex.: 5+3+1+1 = 10%),
 *      pago aos padrinhos por nível (1..N). Um nível sem padrinho NÃO é pago —
 *      essa fatia volta para o agente produtor (não se perde nem duplica).
 *   5. Agente produtor ............. o remanescente.
 *
 * Com upline completo (4 níveis): agente = 100 − 8 − 10 = 82%.
 * Sem qualquer padrinho:          agente = 100 − 8 − 0  = 92%.
 * Ou seja, o agente fica sempre entre ~82% e ~92%, e estar mais acima na árvore
 * (ter afilhados a faturar) é o que gera receita adicional — o motor da rede.
 */

import { COMMISSION } from "./config";

export interface SplitConfig {
  /** Royalties da marca (%). */
  royaltiesPct: number;
  /** Fatia da agência (%). */
  agencyPct: number;
  /** Fundo de reforma do agente (%). */
  retirementPct: number;
  /** Override por nível de afiliação, do nível 1 (padrinho direto) para cima. */
  overrideTiers: number[];
}

/** Derivado da fonte única (config.ts) — nunca se define percentagens aqui. */
export const DEFAULT_SPLIT: SplitConfig = {
  royaltiesPct: COMMISSION.royaltiesPct,
  agencyPct: COMMISSION.royaltiesPct,
  retirementPct: COMMISSION.pensionPct,
  overrideTiers: COMMISSION.overrideTiers,
};

export interface OverrideShare {
  /** Nível de afiliação (1 = padrinho direto). */
  level: number;
  pct: number;
  amount: number;
  /** Foi efetivamente pago (existe padrinho nesse nível)? */
  paid: boolean;
}

export interface SplitResult {
  gross: number;
  royalties: number;
  agency: number;
  retirement: number;
  /** Uma entrada por nível configurado (paga ou não). */
  overrides: OverrideShare[];
  /** % de override efetivamente paga (só níveis com padrinho). */
  overridePaidPct: number;
  /** % que fica para o agente produtor. */
  agentPct: number;
  /** € que fica para o agente produtor. */
  agent: number;
}

/**
 * @deprecated Modelo simplificado (produtor = remanescente). A repartição
 * agente/agência OFICIAL é a ESCADA em `tiers.ts` (`computeLeg`). Mantido só
 * como referência; NÃO usar para valores — usar sempre a escada.
 *
 * @param gross        comissão bruta (€).
 * @param uplineLevels quantos níveis de padrinho existem acima do produtor.
 */
export function computeSplit(
  gross: number,
  uplineLevels = 0,
  cfg: SplitConfig = DEFAULT_SPLIT
): SplitResult {
  const g = Math.max(0, gross || 0);
  const royalties = (g * cfg.royaltiesPct) / 100;
  const agency = (g * cfg.agencyPct) / 100;
  const retirement = (g * cfg.retirementPct) / 100;

  const levels = Math.max(0, Math.min(uplineLevels, cfg.overrideTiers.length));
  const overrides: OverrideShare[] = cfg.overrideTiers.map((pct, i) => {
    const level = i + 1;
    const paid = level <= levels;
    return { level, pct, amount: paid ? (g * pct) / 100 : 0, paid };
  });

  const overridePaidPct = overrides.reduce((s, o) => s + (o.paid ? o.pct : 0), 0);
  const agentPct = 100 - cfg.royaltiesPct - cfg.agencyPct - cfg.retirementPct - overridePaidPct;
  const agent = (g * agentPct) / 100;

  return {
    gross: g,
    royalties,
    agency,
    retirement,
    overrides,
    overridePaidPct,
    agentPct,
    agent,
  };
}

/** Percentagem de override de um dado nível (0 se o nível não existe). */
export function overridePctForLevel(level: number, cfg: SplitConfig = DEFAULT_SPLIT): number {
  return cfg.overrideTiers[level - 1] ?? 0;
}

/** Override (€) que um padrinho recebe de uma venda de um afilhado no nível dado. */
export function overrideForLevel(
  gross: number,
  level: number,
  cfg: SplitConfig = DEFAULT_SPLIT
): number {
  return (Math.max(0, gross || 0) * overridePctForLevel(level, cfg)) / 100;
}

/** Profundidade máxima de override (nº de escalões configurados). */
export function maxOverrideDepth(cfg: SplitConfig = DEFAULT_SPLIT): number {
  return cfg.overrideTiers.length;
}
