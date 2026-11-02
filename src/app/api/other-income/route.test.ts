import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: m.session }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.client }));
import { POST } from "./route";
const request = (extra: Record<string, unknown> = {}) => new Request("http://localhost/api/other-income", { method: "POST", body: JSON.stringify({ category: "credito", requestId: "22222222-2222-2222-2222-222222222222", partner: "Parceiro", description: "Comissão de crédito", gross: 123.45, date: "2026-10-24", ...extra }) });
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ agent: { id: "agent", agencyId: "own", roleKey: "agente" }, demo: false }); });
describe("consultant ancillary income", () => {
  it("requires a real commercial consultant", async () => { m.session.mockResolvedValue(null); expect((await POST(request())).status).toBe(403); m.session.mockResolvedValue({ viewingAs: true, agent: { roleKey: "agente", agencyId: "own" } }); expect((await POST(request())).status).toBe(403); expect(m.client).not.toHaveBeenCalled(); });
  it("rejects inflated and fractional-cent financial entries before database access", async () => { expect((await POST(request({ gross: 123.456 }))).status).toBe(422); expect((await POST(request({ gross: -10 }))).status).toBe(422); expect((await POST(request({ category: "constructor" }))).status).toBe(422); expect(m.client).not.toHaveBeenCalled(); });
});
