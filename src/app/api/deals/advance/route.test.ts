import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  session: vi.fn(),
  gate: vi.fn(),
  advance: vi.fn(),
  property: vi.fn(),
}));
vi.mock("@/lib/supabase/auth", () => ({ getSession: m.session }));
vi.mock("@/lib/db/deals", () => ({
  getDealGate: m.gate,
  advanceDeal: m.advance,
}));
vi.mock("@/lib/db/repo", () => ({ getPropertyById: m.property }));
import { POST } from "./route";
const request = (body: unknown) =>
  new Request("https://housepro.pt/api/deals/advance", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({
    agent: { id: "self", roleKey: "agente", agencyId: "agency" },
    demo: false,
  });
  m.gate.mockResolvedValue({
    propertyId: null,
    agencyId: "agency",
    team: ["self"],
  });
  m.advance.mockResolvedValue({ ok: true, propertyStatus: "reservado" });
});
describe("Deal movement API", () => {
  it("blocks read-only supervision sessions", async () => {
    m.session.mockResolvedValue({ viewingAs: true, agent: { id: "self" } });
    expect(
      (await POST(request({ dealId: "deal", stage: "reserva" }))).status,
    ).toBe(401);
    expect(m.advance).not.toHaveBeenCalled();
  });
  it("persists pointer and keyboard moves through the same authenticated API", async () => {
    expect(
      (
        await POST(
          request({
            dealId: "deal",
            stage: "reserva",
            fromStage: "proposta_aceite",
            actorId: "forged",
          }),
        )
      ).status,
    ).toBe(200);
    expect(m.advance).toHaveBeenCalledWith(
      "deal",
      "reserva",
      "self",
      "proposta_aceite",
    );
  });
  it("reports stale columns as a conflict instead of overwriting another change", async () => {
    m.advance.mockResolvedValue({ error: "stage_conflict" });
    expect(
      (
        await POST(
          request({ dealId: "deal", stage: "reserva", fromStage: "cpcv" }),
        )
      ).status,
    ).toBe(409);
  });
  it("rejects another agency coordinator and invalid stages", async () => {
    m.session.mockResolvedValue({
      agent: { id: "self", roleKey: "coordenador", agencyId: "other" },
      demo: false,
    });
    m.gate.mockResolvedValue({
      propertyId: null,
      agencyId: "agency",
      team: [],
    });
    expect(
      (await POST(request({ dealId: "deal", stage: "reserva" }))).status,
    ).toBe(403);
    expect(
      (await POST(request({ dealId: "deal", stage: "invalid" }))).status,
    ).toBe(400);
    expect(m.advance).not.toHaveBeenCalled();
  });
});
