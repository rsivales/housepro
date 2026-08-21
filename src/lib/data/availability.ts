import type { Lead } from "@/lib/data/leads";

/**
 * Disponibilidade dos consultores para o motor de atribuição — horário de
 * trabalho e férias — e a capacidade diária (limite de leads por dia). Isto
 * alimenta o contexto `unavailable`/`atCapacity` do resolveAssignment, para as
 * regras de substituto/fallback/limite entrarem em ação de forma real.
 *
 * Funções puras e testáveis. Em modo demo usa fixtures; com Supabase os dados
 * viriam de um perfil de disponibilidade e da contagem do dia.
 */

export interface AgentAvailability {
  agentId: string;
  /** De férias até esta data (ISO) — inclusivo. */
  vacationUntil?: string;
  /** Hora de início/fim do horário de trabalho (0–23). Fora disto = indisponível. */
  workStart?: number;
  workEnd?: number;
}

/** Um consultor está indisponível agora (férias ou fora de horário)? */
export function isUnavailable(a: AgentAvailability | undefined, now: Date = new Date()): boolean {
  if (!a) return false;
  if (a.vacationUntil && new Date(a.vacationUntil).getTime() >= now.getTime()) return true;
  if (a.workStart != null && a.workEnd != null) {
    const h = now.getHours();
    if (h < a.workStart || h >= a.workEnd) return true;
  }
  return false;
}

/** Lista de consultores indisponíveis agora, a partir dos perfis. */
export function unavailableAgents(
  profiles: AgentAvailability[],
  now: Date = new Date()
): string[] {
  return profiles.filter((a) => isUnavailable(a, now)).map((a) => a.agentId);
}

/**
 * Consultores que já atingiram o limite diário — contando as leads que lhes
 * foram atribuídas hoje. Sem limite (ausente/0) → ninguém no limite.
 */
export function atCapacityAgents(
  leads: Lead[],
  dailyLimit: number | undefined,
  now: Date = new Date()
): string[] {
  if (!dailyLimit || dailyLimit <= 0) return [];
  const today = now.toISOString().slice(0, 10);
  const count = new Map<string, number>();
  for (const l of leads) {
    if (!l.assignedAgentId) continue;
    if (l.createdAt.slice(0, 10) !== today) continue;
    count.set(l.assignedAgentId, (count.get(l.assignedAgentId) ?? 0) + 1);
  }
  return [...count.entries()].filter(([, n]) => n >= dailyLimit).map(([id]) => id);
}

/** Perfis de disponibilidade de exemplo (modo demo). */
export const demoAvailability: AgentAvailability[] = [
  { agentId: "miguel", vacationUntil: "2026-09-01" }, // de férias
  { agentId: "carla", workStart: 9, workEnd: 19 },
  { agentId: "rui", workStart: 8, workEnd: 20 },
];
