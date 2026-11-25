import { describe, expect, it } from "vitest";

import { agendaPriority, getAgendaAction, type AgendaTask } from "./transaction-agenda";

const now = Date.parse("2026-11-25T08:00:00Z");
const deal = {
  stage: "cpcv" as const, creditStage: "sem_credito" as const,
  escrituraAt: null, cpcvDeadlineAt: null, managerId: "manager", coordinatorId: "coordination",
  buyerAgentId: "buyer-agent", listingAgentId: "listing-agent",
};
const task: AgendaTask = {
  id: "condo", code: "declaracao_condominio", title: "Declaração de condomínio sem dívidas",
  phase: "post_cpcv", status: "received", applicability: "optional", critical: false,
  audience: "seller", dueAt: "2026-11-24T10:00:00Z", ownerId: "assigned-owner",
};

describe("gestão processual", () => {
  it("prioritises an overdue actionable task and its explicit assignee", () => {
    const future: AgendaTask = { ...task, id: "keys", phase: "post_escritura", dueAt: "2026-11-23T10:00:00Z" };
    const action = getAgendaAction({ ...deal, creditStage: "avaliacao" }, [future, task], now);
    expect(action.title).toBe(`Validar — ${task.title}`);
    expect(action.responsible?.id).toBe("assigned-owner");
    expect(agendaPriority(action.deadline, now)).toBe(0);
  });

  it("shows credit follow-up on an older proposal with no checklist", () => {
    const action = getAgendaAction({ ...deal, stage: "proposta_aceite", creditStage: "avaliacao" }, [], now);
    expect(action.title).toBe("Acompanhar avaliação bancária do imóvel");
    expect(action.responsible?.id).toBe("buyer-agent");
    expect(action.deadline).toBeNull();
  });

  it("uses the deed date as the milestone for applicable pre-deed tasks", () => {
    const escrituraAt = "2026-11-27T10:00:00Z";
    const booking: AgendaTask = { ...task, id: "date", code: "data_escritura_agendada", phase: "pre_escritura", status: "pending", applicability: "required", dueAt: escrituraAt, critical: true };
    const action = getAgendaAction({ ...deal, escrituraAt }, [booking, { ...booking, id: "notary", code: "cartorio_confirmado", title: "Cartório confirmado", ownerId: null }], now);
    expect(action.taskId).toBe("notary");
    expect(action.deadline).toEqual({ at: escrituraAt, label: "Data da escritura" });
    expect(action.responsible?.id).toBe("manager");
  });

  it("groups by Lisbon dates across midnight", () => {
    const priority = agendaPriority({ at: "2026-07-21T00:30:00Z", label: "Prazo" }, Date.parse("2026-07-20T23:50:00Z"));
    expect(priority).toBe(1);
  });
});
