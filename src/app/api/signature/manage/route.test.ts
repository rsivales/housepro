import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/admin", () => ({ hasServiceRole: () => true, createAdminClient: () => ({ from: (table: string) => table === "property_audit" ? { insert: mocks.insert } : { update: mocks.update } }) }));
import { PATCH } from "./route";
const request = (patch: Record<string, unknown>) => new Request("http://localhost/api/signature/manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "property-id", patch }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ agent: { id: "admin-id", name: "Admin", role: "admin", roleKey: "admin" } });
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: "property-id", reference: "HP0001-05" }, error: null }) }) }) });
  mocks.insert.mockResolvedValue({ error: null });
});
describe("Signature collection management", () => {
  it("preserves the brand approval gate", async () => {
    mocks.session.mockResolvedValue({ agent: { role: "agente", roleKey: "agente" } });
    expect((await PATCH(request({ signature_collection: "junto-ao-mar" }))).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects unknown themes before saving", async () => {
    expect((await PATCH(request({ signature_collection: "unknown" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("saves a recognised collection canonically and records the change", async () => {
    expect((await PATCH(request({ signature_collection: "Património com história" }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ signature_collection: "patrimonio-com-historia" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ actor_id: "admin-id", action: "signature", changes: [{ field: "signature_collection", to: "patrimonio-com-historia" }] }));
  });
  it("allows removing a theme without removing Signature approval", async () => {
    expect((await PATCH(request({ signature_collection: null }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ signature_collection: null });
  });
});
