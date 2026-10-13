import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/portfolio/server", () => ({
  portfolioSession: m.session,
  UUID: /^[0-9a-f-]{36}$/,
  operationError: () => ({ status: 403, error: "Forbidden" }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: m.rpc }),
}));
import { POST } from "./route";
const id = "11111111-1111-4111-8111-111111111111",
  batch = "22222222-2222-4222-8222-222222222222";
const unit = {
  label: "A01",
  title: "Fração A01",
  typology: "T2",
  price: 300000,
  area: 100,
  areaUtil: 90,
  beds: 2,
  baths: 2,
};
const request = (b: unknown) =>
  new Request("https://housepro.pt/api/properties/duplicate", {
    method: "POST",
    body: JSON.stringify(b),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({ agent: { id }, demo: false });
  m.rpc.mockResolvedValue({
    data: [{ id, reference: "HP1001-01" }],
    error: null,
  });
});
describe("Duplicate API boundaries", () => {
  it("rejects unauthenticated or read-only supervision sessions", async () => {
    m.session.mockResolvedValue(null);
    expect((await POST(request({}))).status).toBe(401);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("validates before writing", async () => {
    expect(
      (
        await POST(
          request({
            sourceId: id,
            batchId: batch,
            agentId: id,
            copyMedia: true,
            units: [{ ...unit, area: -1 }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("uses the session identity, stable batch key and an atomic RPC for 70 fractions", async () => {
    const units = Array.from({ length: 70 }, (_, i) => ({
      ...unit,
      label: `A${i}`,
    }));
    const response = await POST(
      request({
        actorId: "forged",
        sourceId: id,
        batchId: batch,
        agentId: id,
        copyMedia: true,
        units,
        developmentName: "Projeto",
      }),
    );
    expect(response.status).toBe(200);
    expect(m.rpc).toHaveBeenCalledWith(
      "portfolio_duplicate",
      expect.objectContaining({ p_actor: id, p_batch: batch, p_units: units }),
    );
  });
  it("returns permission errors instead of fake successful copies", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: "forbidden" } });
    expect(
      (
        await POST(
          request({
            sourceId: id,
            batchId: batch,
            agentId: id,
            copyMedia: true,
            units: [unit],
          }),
        )
      ).status,
    ).toBe(403);
  });
});
