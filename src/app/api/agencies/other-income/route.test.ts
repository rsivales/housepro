import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), allowed: vi.fn(), read: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: m.session }));
vi.mock("@/lib/db/agency-finance", () => ({ authorizedAgency: m.allowed }));
vi.mock("@/lib/db/commission-regime", () => ({ readCommissionRegime: m.read }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.client }));
import { POST } from "./route";
const agencyId = "11111111-1111-1111-1111-111111111111";
const incomeId = "22222222-2222-2222-2222-222222222222";
const request = () => new Request("http://localhost/api/agencies/other-income", { method: "POST", body: JSON.stringify({ agencyId, incomeId, action: "approve" }) });
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ agent: { id: "broker", roleKey: "agente" }, demo: false }); m.allowed.mockResolvedValue({ id: agencyId }); });
describe("broker partnership approval", () => {
  it("blocks supervision and other agencies before any financial read", async () => { m.session.mockResolvedValue({ viewingAs: true, agent: {} }); expect((await POST(request())).status).toBe(401); m.session.mockResolvedValue({ agent: { id: "broker" }, demo: false }); m.allowed.mockRejectedValue(new Error("forbidden")); expect((await POST(request())).status).toBe(403); expect(m.client).not.toHaveBeenCalled(); });
});
