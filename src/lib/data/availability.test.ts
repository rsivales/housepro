import { describe, it, expect } from "vitest";

import {
  isUnavailable,
  unavailableAgents,
  atCapacityAgents,
  type AgentAvailability,
} from "@/lib/data/availability";
import type { Lead } from "@/lib/data/leads";

describe("disponibilidade", () => {
  const now = new Date("2026-08-20T12:00:00");

  it("férias tornam indisponível", () => {
    expect(isUnavailable({ agentId: "a", vacationUntil: "2026-09-01" }, now)).toBe(true);
    expect(isUnavailable({ agentId: "a", vacationUntil: "2026-08-01" }, now)).toBe(false);
  });
  it("fora do horário torna indisponível", () => {
    expect(isUnavailable({ agentId: "a", workStart: 9, workEnd: 19 }, now)).toBe(false); // 12h dentro
    expect(isUnavailable({ agentId: "a", workStart: 9, workEnd: 11 }, now)).toBe(true); // 12h fora
  });
  it("lista os indisponíveis", () => {
    const profiles: AgentAvailability[] = [
      { agentId: "ferias", vacationUntil: "2026-09-01" },
      { agentId: "ativo", workStart: 8, workEnd: 20 },
    ];
    expect(unavailableAgents(profiles, now)).toEqual(["ferias"]);
  });
});

describe("capacidade diária", () => {
  const now = new Date("2026-08-20T12:00:00Z");
  const lead = (id: string, agent: string, day: string): Lead => ({
    id,
    ownerId: agent,
    assignedAgentId: agent,
    name: "x",
    contact: "1",
    intent: "mensagem",
    source: "facebook",
    status: "novo",
    createdAt: `${day}T09:00:00Z`,
  });

  it("marca quem atingiu o limite hoje", () => {
    const leads = [lead("1", "rui", "2026-08-20"), lead("2", "rui", "2026-08-20"), lead("3", "ana", "2026-08-20")];
    expect(atCapacityAgents(leads, 2, now)).toEqual(["rui"]);
    expect(atCapacityAgents(leads, undefined, now)).toEqual([]);
  });
  it("ignora leads de outros dias", () => {
    const leads = [lead("1", "rui", "2026-08-19"), lead("2", "rui", "2026-08-19")];
    expect(atCapacityAgents(leads, 2, now)).toEqual([]);
  });
});
