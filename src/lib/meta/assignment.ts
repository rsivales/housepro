import type { Campaign, AssignmentRule } from "@/lib/data/meta";

/**
 * Motor de atribuição de leads — decide o AGENTE atualmente responsável (4) a
 * partir da regra da campanha, sem lhe tirar a ORIGEM COMERCIAL (3).
 *
 * Estratégias: consultor específico, equipa, rotação (simples e ponderada),
 * por zona, orçamento, idioma, especialidade, pelo angariador do imóvel,
 * "primeiro a aceitar", manual, ou sem responsável (inbox).
 *
 * Depois de escolher um candidato, aplica-se um "portão" de disponibilidade:
 * se o destino estiver indisponível (horário/férias) ou no limite diário,
 * tenta-se o SUBSTITUTO e depois o FALLBACK; se nada resultar, vai para o inbox.
 *
 * É uma função pura — a persistência (índice do round-robin, contagens diárias,
 * lista de indisponíveis) é responsabilidade do chamador.
 */

export interface AssignContext {
  campaign: Campaign;
  rule?: AssignmentRule;
  /** Angariador do imóvel associado (strategy = property). */
  propertyOwnerId?: string;
  /** Zona/concelho indicado na lead (strategy = zone). */
  zone?: string;
  /** Orçamento indicado (strategy = budget). */
  budget?: string;
  /** Idioma da lead (strategy = language). */
  language?: string;
  /** Especialidade pretendida (strategy = specialty). */
  specialty?: string;
  /** Consultores indisponíveis agora (horário/férias) — calculado pelo chamador. */
  unavailable?: string[];
  /** Consultores que atingiram o limite diário — calculado pelo chamador. */
  atCapacity?: string[];
}

export interface AssignResult {
  assignedAgentId?: string;
  assignedTeamId?: string;
  unassigned: boolean;
  /** Novo índice do round-robin, quando aplicável (para o chamador persistir). */
  rrIndexNext?: number;
  /** "Primeiro a aceitar": conjunto a quem a lead foi oferecida. */
  offeredTo?: string[];
  /** Descrição do que foi decidido (para a linha do tempo). */
  note: string;
}

const inbox = (note: string, offeredTo?: string[]): AssignResult => ({
  unassigned: true,
  note,
  ...(offeredTo && offeredTo.length ? { offeredTo } : {}),
});

/** Sequência ponderada a partir do pool + pesos (peso em falta = 1). */
function weightedSequence(pool: string[], weights?: Record<string, number>): string[] {
  const seq: string[] = [];
  for (const id of pool) {
    const w = Math.max(1, Math.round(weights?.[id] ?? 1));
    for (let i = 0; i < w; i++) seq.push(id);
  }
  return seq;
}

export function resolveAssignment(ctx: AssignContext): AssignResult {
  const { rule } = ctx;
  if (!rule || !rule.active || rule.strategy === "unassigned" || rule.strategy === "manual") {
    return inbox(
      rule?.strategy === "manual"
        ? "Distribuição manual — aguarda o gestor no inbox."
        : "Sem regra de atribuição — foi para o inbox “sem responsável”."
    );
  }

  const unavailable = new Set(ctx.unavailable ?? []);
  const atCapacity = new Set(ctx.atCapacity ?? []);
  const isAvail = (id?: string): boolean => Boolean(id) && !unavailable.has(id!) && !atCapacity.has(id!);

  // Aplica substituto → fallback → inbox quando o candidato não serve.
  const withFallback = (note: string): AssignResult => {
    if (isAvail(rule.substituteId)) {
      return { assignedAgentId: rule.substituteId, unassigned: false, note: `${note} → substituto.` };
    }
    if (isAvail(rule.fallbackId)) {
      return { assignedAgentId: rule.fallbackId, unassigned: false, note: `${note} → fallback.` };
    }
    return inbox(`${note} → inbox (sem elegível).`);
  };
  const finalize = (candidate: string | undefined, note: string, extra?: Partial<AssignResult>): AssignResult => {
    if (!candidate) return withFallback(note);
    if (isAvail(candidate)) return { assignedAgentId: candidate, unassigned: false, note, ...extra };
    return withFallback(`${note} (destino indisponível)`);
  };
  const mapLookup = (map: Record<string, string> | undefined, value: string | undefined): string | undefined => {
    if (!map || !value) return undefined;
    const v = value.trim().toLowerCase();
    const key = Object.keys(map).find((k) => k.toLowerCase() === v);
    return key ? map[key] : undefined;
  };

  switch (rule.strategy) {
    case "specific":
      return rule.agentId
        ? finalize(rule.agentId, `Atribuída ao consultor ${rule.agentName ?? rule.agentId}.`)
        : inbox("Regra “consultor específico” sem consultor definido.");

    case "team":
      return rule.teamId
        ? { assignedTeamId: rule.teamId, unassigned: false, note: "Atribuída à equipa." }
        : inbox("Regra “equipa” sem equipa definida.");

    case "round_robin": {
      const pool = rule.pool ?? [];
      if (pool.length === 0) return inbox("Rotação sem consultores no conjunto.");
      const idx = (((rule.rrIndex ?? 0) % pool.length) + pool.length) % pool.length;
      return finalize(pool[idx], `Atribuída por rotação (${idx + 1}/${pool.length}).`, {
        rrIndexNext: (idx + 1) % pool.length,
      });
    }

    case "round_robin_weighted": {
      const pool = rule.pool ?? [];
      if (pool.length === 0) return inbox("Rotação ponderada sem consultores.");
      const seq = weightedSequence(pool, rule.weights);
      const idx = (((rule.rrIndex ?? 0) % seq.length) + seq.length) % seq.length;
      return finalize(seq[idx], `Atribuída por rotação ponderada (${idx + 1}/${seq.length}).`, {
        rrIndexNext: (idx + 1) % seq.length,
      });
    }

    case "zone":
      return finalize(mapLookup(rule.zoneMap, ctx.zone), `Atribuída por zona (${ctx.zone ?? "—"}).`);

    case "budget":
      return finalize(mapLookup(rule.budgetMap, ctx.budget), `Atribuída por orçamento (${ctx.budget ?? "—"}).`);

    case "language":
      return finalize(mapLookup(rule.languageMap, ctx.language), `Atribuída por idioma (${ctx.language ?? "—"}).`);

    case "specialty":
      return finalize(mapLookup(rule.specialtyMap, ctx.specialty), `Atribuída por especialidade (${ctx.specialty ?? "—"}).`);

    case "property":
      return ctx.propertyOwnerId
        ? finalize(ctx.propertyOwnerId, "Atribuída ao angariador do imóvel.")
        : inbox("Sem angariador associado — foi para o inbox.");

    case "first_accept": {
      const pool = (rule.pool ?? []).filter((id) => isAvail(id));
      if (pool.length === 0) return withFallback("Ninguém disponível para “primeiro a aceitar”");
      return inbox(
        `Oferecida a ${pool.length} consultor(es) — o primeiro a aceitar fica com ela.`,
        pool
      );
    }

    default:
      return inbox("Estratégia desconhecida — foi para o inbox.");
  }
}
