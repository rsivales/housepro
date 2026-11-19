import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn(), authorized: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: m.session }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.client }));
vi.mock("@/lib/db/agency-finance", () => ({ authorizedAgency: m.authorized }));
import { POST } from "./route";
const uuid = "11111111-1111-1111-1111-111111111111";
const request = (body: unknown) => new Request("http://localhost/api/finance/fees", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  m.client.mockReturnValue({});
  m.session.mockResolvedValue({ agent: { id: uuid, roleKey: "agente" }, demo: false });
});
describe("fees write authorization", () => {
  it("blocks signed-out, demo and supervision writes", async () => {
    for (const session of [null, { demo: true }, { viewingAs: true }]) {
      m.session.mockResolvedValue(session);
      expect((await POST(request({ action: "generate" }))).status).toBe(401);
    }
    expect(m.client).not.toHaveBeenCalled();
  });
  it("does not let an agent approve Pro Producer or configure fees", async () => {
    for (const action of ["decide","create_plan","paid","generate","stop_plan"]) {
      expect((await POST(request({ action, id: uuid, approve: true }))).status).toBe(403);
    }
  });
  it("checks the broker's agency before accepting a proposal", async () => {
    m.authorized.mockRejectedValue(new Error("forbidden"));
    expect((await POST(request({ action: "propose", agencyId: uuid, agentId: uuid }))).status).toBe(403);
  });
  it("requires positive cent amounts and an unbackdated month even for the master", async () => {
    m.session.mockResolvedValue({ agent: { id: uuid, roleKey: "superadmin" } });
    expect((await POST(request({ action: "create_plan", agencyId: uuid, agentId: null, amount: -300, startsOn: "2026-01-01" }))).status).toBe(422);
  });
});
