import type { Campaign, AssignmentRule } from "@/lib/data/meta";

/**
 * Motor de atribuição de leads — decide o AGENTE atualmente responsável (4) a
 * partir da regra da campanha, sem lhe tirar a ORIGEM COMERCIAL (3).
 *
 * Estratégias: consultor específico, equipa, rotação (round-robin), por zona,
 * pelo angariador do imóvel, ou sem responsável (fica no inbox). É uma função
 * pura — a persistência (e o avanço do índice do round-robin) é do chamador.
 */

export interface AssignContext {
  campaign: Campaign;
  rule?: AssignmentRule;
  /** Angariador do imóvel associado (strategy = property). */
  propertyOwnerId?: string;
  /** Zona/concelho indicado na lead (strategy = zone). */
  zone?: string;
}

export interface AssignResult {
  assignedAgentId?: string;
  assignedTeamId?: string;
  unassigned: boolean;
  /** Novo índice do round-robin, quando aplicável (para o chamador persistir). */
  rrIndexNext?: number;
  /** Descrição do que foi decidido (para a linha do tempo). */
  note: string;
}

const inbox = (note: string): AssignResult => ({ unassigned: true, note });

export function resolveAssignment(ctx: AssignContext): AssignResult {
  const { rule } = ctx;
  if (!rule || !rule.active || rule.strategy === "unassigned") {
    return inbox("Sem regra de atribuição — foi para o inbox “sem responsável”.");
  }

  switch (rule.strategy) {
    case "specific": {
      if (rule.agentId) {
        return {
          assignedAgentId: rule.agentId,
          unassigned: false,
          note: `Atribuída ao consultor ${rule.agentName ?? rule.agentId}.`,
        };
      }
      return inbox("Regra “consultor específico” sem consultor definido.");
    }

    case "team": {
      if (rule.teamId) {
        return {
          assignedTeamId: rule.teamId,
          unassigned: false,
          note: "Atribuída à equipa.",
        };
      }
      return inbox("Regra “equipa” sem equipa definida.");
    }

    case "round_robin": {
      const pool = rule.pool ?? [];
      if (pool.length === 0) return inbox("Rotação sem consultores no conjunto.");
      const idx = ((rule.rrIndex ?? 0) % pool.length + pool.length) % pool.length;
      const agentId = pool[idx];
      return {
        assignedAgentId: agentId,
        unassigned: false,
        rrIndexNext: (idx + 1) % pool.length,
        note: `Atribuída por rotação (${idx + 1}/${pool.length}).`,
      };
    }

    case "zone": {
      const z = (ctx.zone ?? "").trim().toLowerCase();
      const map = rule.zoneMap ?? {};
      const key = Object.keys(map).find((k) => k.toLowerCase() === z);
      if (key && map[key]) {
        return {
          assignedAgentId: map[key],
          unassigned: false,
          note: `Atribuída por zona (${ctx.zone}).`,
        };
      }
      return inbox("Zona sem destino na regra — foi para o inbox.");
    }

    case "property": {
      if (ctx.propertyOwnerId) {
        return {
          assignedAgentId: ctx.propertyOwnerId,
          unassigned: false,
          note: "Atribuída ao angariador do imóvel.",
        };
      }
      return inbox("Sem angariador associado — foi para o inbox.");
    }

    default:
      return inbox("Estratégia desconhecida — foi para o inbox.");
  }
}
