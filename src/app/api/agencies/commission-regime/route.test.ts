import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_REGIME } from "@/lib/data/commission-regime";
const m = vi.hoisted(() => ({ session: vi.fn(), allowed: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: m.session }));
vi.mock("@/lib/db/agency-finance", () => ({ authorizedAgency: m.allowed }));
vi.mock("@/lib/db/commission-regime", () => ({ readCommissionRegime: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.client }));
import { PUT } from "./route";
const agencyId = "11111111-1111-1111-1111-111111111111";
const request = (extra: Record<string, unknown> = {}) => new Request("http://localhost/api/agencies/commission-regime", { method: "PUT", body: JSON.stringify({ agencyId, version: 0, plan: DEFAULT_REGIME, ...extra }) });
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ agent: { id: "broker", roleKey: "agente" }, demo: false }); m.allowed.mockResolvedValue({ id: agencyId }); });
describe("commission regime write boundary", () => {
  it("blocks supervision and unauthenticated writes", async () => { m.session.mockResolvedValue(null); expect((await PUT(request())).status).toBe(401); m.session.mockResolvedValue({ viewingAs: true, agent: {} }); expect((await PUT(request())).status).toBe(401); expect(m.client).not.toHaveBeenCalled(); });
  it("does not let a broker edit another agency or mandatory royalties", async () => { m.allowed.mockRejectedValue(new Error("forbidden")); expect((await PUT(request())).status).toBe(403); expect((await PUT(request({ plan: { ...DEFAULT_REGIME, royaltiesPct: 1 } }))).status).toBe(422); expect(m.client).not.toHaveBeenCalled(); });
});
