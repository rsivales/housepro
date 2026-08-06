/**
 * Faturação & pagamentos — liga o fecho de negócio ao processamento real.
 *
 * Quando um negócio fecha, geram-se linhas de pagamento (payouts) por
 * beneficiário: a produção (consultor), o override da rede, os royalties da
 * agência e a contribuição de 2% para o fundo de pensão. Cada linha tem um
 * estado (pendente → processado → pago) e alimenta o dashboard do fundo.
 */

export type PayoutRole = "producao" | "override" | "royalties" | "pensao";
export type PayoutStatus = "pendente" | "processado" | "pago";

export const ROLE_LABEL: Record<PayoutRole, string> = {
  producao: "Produção (consultor)",
  override: "Override de rede",
  royalties: "Royalties da agência",
  pensao: "Fundo de pensão (2%)",
};

export const STATUS_LABEL: Record<PayoutStatus, { label: string; badge: string }> = {
  pendente: { label: "Pendente", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  processado: { label: "Processado", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  pago: { label: "Pago", badge: "bg-primary/15 text-primary" },
};

export const STATUS_FLOW: PayoutStatus[] = ["pendente", "processado", "pago"];

export interface Payout {
  id: string;
  dealRef: string;
  beneficiaryId: string;
  beneficiaryName: string;
  role: PayoutRole;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  paidAt?: string;
}

export interface PayoutInputs {
  dealRef: string;
  producerId: string;
  producerName: string;
  producerNet: number;
  royalties: number;
  pension: number;
  agencyId?: string;
  overrides?: { agentId: string; name: string; amount: number }[];
}

/** Constrói as linhas de pagamento a partir dos valores de um fecho. */
export function buildPayouts(input: PayoutInputs): Payout[] {
  const now = new Date().toISOString();
  const list: Payout[] = [];
  const mk = (beneficiaryId: string, beneficiaryName: string, role: PayoutRole, amount: number): Payout => ({
    id: `pay-${input.dealRef}-${role}-${beneficiaryId}-${Math.random().toString(36).slice(2, 6)}`,
    dealRef: input.dealRef, beneficiaryId, beneficiaryName, role,
    amount: Math.round(amount), status: "pendente", createdAt: now,
  });
  if (input.producerNet > 0) list.push(mk(input.producerId, input.producerName, "producao", input.producerNet));
  for (const o of input.overrides ?? []) {
    if (o.amount > 0) list.push(mk(o.agentId, o.name, "override", o.amount));
  }
  if (input.royalties > 0) list.push(mk(input.agencyId ?? "agencia", "Agência", "royalties", input.royalties));
  if (input.pension > 0) list.push(mk(input.producerId, input.producerName, "pensao", input.pension));
  return list;
}

export function payoutTotals(list: Payout[]) {
  const t = { total: 0, pendente: 0, processado: 0, pago: 0, pensao: 0 };
  for (const p of list) {
    t.total += p.amount;
    t[p.status] += p.amount;
    if (p.role === "pensao") t.pensao += p.amount;
  }
  return t;
}

/** Payouts de exemplo (modo demo, à volta do consultor "rui"). */
export function demoPayouts(): Payout[] {
  return [
    { id: "p1", dealRef: "HP-1048", beneficiaryId: "rui", beneficiaryName: "Rui Tavares", role: "producao", amount: 4250, status: "pago", createdAt: "2026-07-10T10:00:00", paidAt: "2026-07-15T10:00:00" },
    { id: "p2", dealRef: "HP-1048", beneficiaryId: "rui", beneficiaryName: "Rui Tavares", role: "pensao", amount: 100, status: "pago", createdAt: "2026-07-10T10:00:00", paidAt: "2026-07-15T10:00:00" },
    { id: "p3", dealRef: "HP-1051", beneficiaryId: "rui", beneficiaryName: "Rui Tavares", role: "producao", amount: 3100, status: "processado", createdAt: "2026-07-28T10:00:00" },
    { id: "p4", dealRef: "HP-1051", beneficiaryId: "rui", beneficiaryName: "Rui Tavares", role: "override", amount: 180, status: "pendente", createdAt: "2026-07-28T10:00:00" },
    { id: "p5", dealRef: "HP-1051", beneficiaryId: "rui", beneficiaryName: "Rui Tavares", role: "pensao", amount: 72, status: "pendente", createdAt: "2026-07-28T10:00:00" },
  ];
}
