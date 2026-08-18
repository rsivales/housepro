import type { Lead } from "@/lib/data/leads";

/**
 * Automações e SLA das leads Meta.
 *
 * SLA de 1.º contacto: uma lead PAGA tem de ser contactada depressa. Se estiver
 * atribuída, ainda "nova" (por contactar) e já passou o prazo, fica EM ATRASO —
 * a coordenação vê no relatório e o consultor é notificado. Alinha-se com o
 * módulo de SLA de contacto já existente, mas com prazo mais curto (lead paga).
 */

export const LEAD_SLA_HOURS = 24;

const ageHours = (iso: string, now: Date): number =>
  (now.getTime() - new Date(iso).getTime()) / 3_600_000;

/** Considera-se contactada quando saiu do estado "novo". */
export function isLeadContacted(lead: Lead): boolean {
  return Boolean(lead.contactedAt) || (lead.status != null && lead.status !== "novo");
}

/** Lead atribuída, por contactar e fora do prazo de SLA. */
export function leadSlaOverdue(lead: Lead, now: Date = new Date()): boolean {
  if (lead.unassigned || !lead.assignedAgentId) return false;
  if (isLeadContacted(lead)) return false;
  return ageHours(lead.createdAt, now) >= LEAD_SLA_HOURS;
}

/** Leads em atraso de 1.º contacto. */
export function overdueLeads(leads: Lead[], now: Date = new Date()): Lead[] {
  return leads.filter((l) => leadSlaOverdue(l, now));
}

export interface AutomationSummary {
  /** Leads sem responsável há mais de X horas (a distribuir com urgência). */
  unassignedAging: number;
  /** Leads atribuídas em atraso de 1.º contacto. */
  slaOverdue: number;
}

/** Resumo das automações/SLA para o painel. */
export function automationSummary(leads: Lead[], now: Date = new Date()): AutomationSummary {
  return {
    unassignedAging: leads.filter(
      (l) => l.unassigned && ageHours(l.createdAt, now) >= LEAD_SLA_HOURS
    ).length,
    slaOverdue: overdueLeads(leads, now).length,
  };
}
