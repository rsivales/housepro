/** Helix transaction indicators — pure, timezone-safe calculations.
 * Presentation only: never substitute for verified contractual/documentary state.
 */
export type TransactionSecurity = "inseguro" | "em_confirmacao" | "compromisso" | "elevada" | "concluido";
export type LeadTemperature = "frio" | "fresco" | "morno" | "quente" | "muito_quente";
export type DeadlineUrgency = "sem_prazo" | "normal" | "atencao" | "urgente" | "critico" | "vencido" | "concluido";

export function transactionSecurity(stage: string, evidenceConfirmed: boolean): TransactionSecurity {
  if (stage === "concluido" || stage === "escritura") return evidenceConfirmed ? "concluido" : "elevada";
  if (stage === "cpcv") return evidenceConfirmed ? "elevada" : "em_confirmacao";
  if (stage === "reserva") return evidenceConfirmed ? "compromisso" : "em_confirmacao";
  if (stage === "proposta_aceite") return "em_confirmacao";
  return "inseguro";
}

/** Last meaningful commercial interaction, not last page view. */
export function leadTemperature(inactiveHours: number): LeadTemperature {
  if (!Number.isFinite(inactiveHours) || inactiveHours < 0) throw new Error("invalid inactiveHours");
  if (inactiveHours <= 48) return "muito_quente";
  if (inactiveHours <= 120) return "quente";
  if (inactiveHours <= 240) return "morno";
  if (inactiveHours <= 336) return "fresco";
  return "frio";
}

export function remainingTime(deadlineISO: string | null, now = new Date()): { hours: number; days: number; remainderHours: number; expired: boolean } | null {
  if (!deadlineISO) return null;
  const target = new Date(deadlineISO);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return null;
  const milliseconds = target.getTime() - now.getTime();
  const hours = Math.max(0, Math.ceil(milliseconds / 3_600_000));
  return { hours, days: Math.floor(hours / 24), remainderHours: hours % 24, expired: milliseconds < 0 };
}

/** Escalate only when pending validations exist. Never conflate with security. */
export function deadlineUrgency(deadlineISO: string | null, pendingCritical: number, pendingTotal: number, completed = false, now = new Date()): DeadlineUrgency {
  if (completed) return "concluido";
  const r = remainingTime(deadlineISO, now);
  if (!r) return "sem_prazo";
  if (r.expired) return "vencido";
  if (pendingTotal <= 0) return "normal";
  if (r.hours <= 24 && pendingCritical > 0) return "critico";
  if (r.hours <= 48 && pendingCritical > 0) return "critico";
  if (r.hours <= 72 || (r.hours <= 168 && pendingCritical > 0)) return "urgente";
  if (r.hours <= 168) return "atencao";
  return "normal";
}

/** Milestones for notification deduplication; caller must persist dispatch keys. */
export const CONTRACT_MILESTONES_DAYS = [30, 15, 7, 3, 1, 0] as const;
export const PRE_ESCRITURA_MILESTONES_DAYS = [7, 5, 3, 2, 1, 0] as const;
export function notificationKey(dealId: string, obligationId: string, deadlineVersion: string, milestone: number, channel: "email" | "internal", recipientId: string): string {
  return [dealId, obligationId, deadlineVersion, milestone, channel, recipientId].map(encodeURIComponent).join(":");
}
