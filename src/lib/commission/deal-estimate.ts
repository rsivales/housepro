import { computeLeg } from "./tiers";
export interface ProducerContext {
  id: string;
  name: string;
  monthlyGross: number;
  companyValidated: boolean;
}
export interface ProducerEstimate {
  id: string;
  name: string;
  allocationPct: number;
  commissionBase: number;
  agentGross: number;
  royalties: number;
  pension: number;
  agentNet: number;
  agentSplitPct: number;
}
export interface DealCommissionEstimate {
  status: "ready" | "missing";
  reason?: string;
  gross: number | null;
  externalShare: number;
  retained: number | null;
  producers: ProducerEstimate[];
}
export interface DealEstimateInput {
  gross: number | null;
  externalShare: number | null;
  coBroker: boolean;
  producerId: string | null;
  buyerAgentId: string | null;
  allocations: unknown;
}
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Read-only projection of the existing ladder. Does not create payouts or alter counters. */
export function estimateDealCommission(
  input: DealEstimateInput,
  profiles: Map<string, ProducerContext>,
): DealCommissionEstimate {
  const missing = (reason: string): DealCommissionEstimate => ({
    status: "missing",
    reason,
    gross: input.gross,
    externalShare: input.externalShare ?? 0,
    retained: null,
    producers: [],
  });
  if (input.gross == null || !Number.isFinite(input.gross) || input.gross < 0)
    return missing("Comissão do negócio por definir.");
  if (
    input.coBroker &&
    (input.externalShare == null ||
      !Number.isFinite(input.externalShare) ||
      input.externalShare < 0 ||
      input.externalShare > input.gross)
  )
    return missing("Partilha com a outra agência por validar.");
  const external = input.coBroker ? cents(input.externalShare ?? 0) : 0,
    retained = cents(input.gross - external);
  let allocations: { id: string; pct: number }[] = [];
  if (Array.isArray(input.allocations) && input.allocations.length) {
    allocations = input.allocations.map((a) => ({
      id: String(a?.agent_id ?? a?.agentId ?? ""),
      pct: Number(a?.pct),
    }));
    if (
      allocations.some(
        (a) => !a.id || !Number.isFinite(a.pct) || a.pct <= 0 || a.pct > 100,
      ) ||
      new Set(allocations.map((a) => a.id)).size !== allocations.length ||
      Math.abs(allocations.reduce((n, a) => n + a.pct, 0) - 100) > 0.00001
    )
      return missing("A repartição interna deve totalizar 100%.");
  } else if (
    input.producerId &&
    (!input.buyerAgentId || input.buyerAgentId === input.producerId)
  )
    allocations = [{ id: input.producerId, pct: 100 }];
  else return missing("Repartição entre os consultores por definir no imóvel.");
  if (allocations.some((a) => !profiles.has(a.id)))
    return missing(
      "Dados do consultor indisponíveis para calcular a comissão.",
    );
  const totalCents = Math.round(retained * 100);
  const bases = allocations.map((a) => Math.floor((totalCents * a.pct) / 100));
  let remaining = totalCents - bases.reduce((n, a) => n + a, 0);
  const remainderOrder = allocations
    .map((a, i) => ({ i, remainder: (totalCents * a.pct) / 100 - bases[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const item of remainderOrder) {
    if (remaining <= 0) break;
    bases[item.i]++;
    remaining--;
  }
  const producers = allocations.map((a, i) => {
    const p = profiles.get(a.id)!;
    const baseCents = bases[i];
    const commissionBase = baseCents / 100,
      prior = Math.max(0, p.monthlyGross);
    if (!Number.isFinite(prior)) return null;
    // Agency accumulated share is projected from the same registered cycle and ladder.
    const priorLeg = computeLeg({
      legCommission: prior,
      priorFaturacao: 0,
      priorAgencyTake: 0,
      hasValidatedCompany: p.companyValidated,
    });
    const leg = computeLeg({
      legCommission: commissionBase,
      priorFaturacao: prior,
      priorAgencyTake: priorLeg.agencyGross,
      hasValidatedCompany: p.companyValidated,
    });
    const agentGross = cents(leg.agentGross),
      royalties = cents(leg.royaltiesAgent),
      pension = cents(leg.pension);
    return {
      id: p.id,
      name: p.name,
      allocationPct: a.pct,
      commissionBase,
      agentGross,
      royalties,
      pension,
      agentNet: cents(agentGross - royalties - pension),
      agentSplitPct: leg.agentSplitPct,
    };
  });
  if (producers.some((p) => p === null))
    return missing("Acumulado de faturação inválido.");
  return {
    status: "ready",
    gross: cents(input.gross),
    externalShare: external,
    retained,
    producers: producers as ProducerEstimate[],
  };
}
