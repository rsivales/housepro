/**
 * Comissão em escada (patamares de produtividade) + cap da agência + deduções.
 *
 * Regras (todas PARAMETRIZÁVEIS — nada fixo no negócio):
 *  • A faturação acumulada no ciclo de 12 meses determina a % do agente, banda
 *    a banda (marginal). Com empresa própria validada, +10 pontos face a
 *    recibos verdes (compensa o custo de "entidade contratante" na Seg. Social).
 *  • A agência fica com o resto, mas nunca mais do que o CAP por ciclo; ao
 *    atingir o cap, o excedente vai para o agente (~100% até ao reset).
 *  • Deduções: royalties da marca (lado agente + lado agência) e fundo de
 *    pensão (lado agente) — retiradas primeiro, para assegurar esses valores.
 *  • Até 10% (pool de rede) é financiado pela fatia da AGÊNCIA e distribuído
 *    pelos padrinhos do produtor (ver override-chain); aqui devolve-se o teto
 *    disponível para esse pool.
 */

import { COMMISSION, NETWORK_POOL_PCT } from "./config";

export interface LadderBand {
  /** Limite superior da banda de faturação acumulada (€). */
  upTo: number;
  /** % do agente nesta banda — com empresa própria validada. */
  withCompany: number;
  /** % do agente nesta banda — recibos verdes (−10 pontos). */
  withoutCompany: number;
}

export interface CommissionPlan {
  ladder: LadderBand[];
  /** Teto do que a agência recebe de um agente por ciclo (€). */
  agencyCap: number;
  royaltiesAgentPct: number;
  royaltiesAgencyPct: number;
  pensionPct: number;
  /** Pool de rede (% da comissão da perna), financiado pela agência. */
  networkPoolPct: number;
}

/** Derivado da fonte única (config.ts) — nunca se define percentagens aqui. */
export const DEFAULT_PLAN: CommissionPlan = {
  ladder: COMMISSION.ladder.map((b) => ({ ...b })),
  agencyCap: COMMISSION.agencyCap,
  royaltiesAgentPct: COMMISSION.royaltiesPct,
  royaltiesAgencyPct: COMMISSION.royaltiesPct,
  pensionPct: COMMISSION.pensionPct,
  networkPoolPct: NETWORK_POOL_PCT,
};

export interface LegInput {
  /** Comissão desta perna (angariação OU venda) atribuída ao agente (€). */
  legCommission: number;
  /** Faturação acumulada do agente NESTE ciclo, antes desta perna (€). */
  priorFaturacao: number;
  /** Já recebido pela agência deste agente neste ciclo (para o cap) (€). */
  priorAgencyTake: number;
  /** Tem empresa própria validada? (senão, recibos verdes). */
  hasValidatedCompany: boolean;
}

export interface LegBreakdown {
  legCommission: number;
  /** % média do agente resultante da escada nesta perna. */
  agentSplitPct: number;
  /** Bruto do agente (antes de deduções), já com o cap aplicado. */
  agentGross: number;
  /** Bruto da agência (antes de deduções e rede), já limitado pelo cap. */
  agencyGross: number;
  /** Excedente do cap devolvido ao agente (€). */
  capReturnedToAgent: number;
  royaltiesAgent: number;
  royaltiesAgency: number;
  pension: number;
  /** Teto do pool de rede disponível (financiado pela agência) (€). */
  networkPoolMax: number;
  /** Líquido do agente (produção pessoal) após deduções (€). */
  agentNet: number;
  /** Novo acumulado de faturação do agente. */
  newFaturacao: number;
  /** Novo acumulado recebido pela agência. */
  newAgencyTake: number;
}

/** Split marginal do agente sobre a nova faturação [prior, prior+leg]. */
function marginalAgentGross(
  prior: number,
  leg: number,
  plan: CommissionPlan,
  hasCompany: boolean
): { gross: number; blendedPct: number } {
  let remaining = leg;
  let cursor = prior;
  let gross = 0;
  for (const band of plan.ladder) {
    if (remaining <= 0) break;
    const bandRoom = band.upTo - cursor;
    if (bandRoom <= 0) continue;
    const take = Math.min(remaining, bandRoom);
    const pct = hasCompany ? band.withCompany : band.withoutCompany;
    gross += (take * pct) / 100;
    remaining -= take;
    cursor += take;
  }
  const blendedPct = leg > 0 ? (gross / leg) * 100 : 0;
  return { gross, blendedPct };
}

/** Reparte uma perna de comissão segundo a escada, o cap e as deduções. */
export function computeLeg(input: LegInput, plan: CommissionPlan = DEFAULT_PLAN): LegBreakdown {
  const leg = Math.max(0, input.legCommission || 0);
  const { gross: agentGrossRaw, blendedPct } = marginalAgentGross(
    input.priorFaturacao,
    leg,
    plan,
    input.hasValidatedCompany
  );
  let agencyGross = leg - agentGrossRaw;

  // Cap: a agência não recebe mais do que o teto por ciclo; excedente → agente.
  const capRoom = Math.max(0, plan.agencyCap - input.priorAgencyTake);
  let capReturned = 0;
  if (agencyGross > capRoom) {
    capReturned = agencyGross - capRoom;
    agencyGross = capRoom;
  }
  const agentGross = agentGrossRaw + capReturned;

  // Deduções.
  const royaltiesAgent = (agentGross * plan.royaltiesAgentPct) / 100;
  const pension = (agentGross * plan.pensionPct) / 100;
  const royaltiesAgency = (agencyGross * plan.royaltiesAgencyPct) / 100;
  const agentNet = agentGross - royaltiesAgent - pension;

  // Pool de rede: financiado pela agência, até networkPoolPct da perna, nunca
  // acima do que resta à agência depois dos seus royalties.
  const networkPoolMax = Math.min(
    (leg * plan.networkPoolPct) / 100,
    Math.max(0, agencyGross - royaltiesAgency)
  );

  return {
    legCommission: leg,
    agentSplitPct: blendedPct,
    agentGross,
    agencyGross,
    capReturnedToAgent: capReturned,
    royaltiesAgent,
    royaltiesAgency,
    pension,
    networkPoolMax,
    agentNet,
    newFaturacao: input.priorFaturacao + leg,
    newAgencyTake: input.priorAgencyTake + agencyGross,
  };
}

/** Nome do patamar de comissão atual (para etiquetas). */
export function currentTierLabel(faturacao: number, plan: CommissionPlan = DEFAULT_PLAN): string {
  const idx = plan.ladder.findIndex((b) => faturacao < b.upTo);
  const band = plan.ladder[idx === -1 ? plan.ladder.length - 1 : idx];
  return `${band.withCompany}% / ${band.withoutCompany}%`;
}
