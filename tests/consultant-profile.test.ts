import { beforeEach, describe, expect, it, vi } from "vitest";
import { isProfileMediaUrl } from "@/lib/profile-media";

const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), from: vi.fn(), configured: vi.fn(() => true), service: vi.fn(() => true) }));
vi.mock("@/lib/supabase/auth", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: mocks.configured }));
vi.mock("@/lib/supabase/admin", () => ({ hasServiceRole: mocks.service, createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
import { POST as submit } from "@/app/api/profile/change-request/route";
import { POST as decide } from "@/app/api/admin/profile-requests/decision/route";
const id = "8f2d59dd-aedf-45ff-a8ef-04809208f1a0";
const url = `https://tlybxrsveqhofvfxovil.supabase.co/storage/v1/object/public/consultant-media/${id}/photo.webp`;
const request = (body: unknown) => new Request("http://localhost/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://tlybxrsveqhofvfxovil.supabase.co");
  mocks.session.mockResolvedValue({ demo: false, agent: { id, roleKey: "agente" } });
});

describe("immutable profile media", () => {
  it("accepts only managed immutable images belonging to the uploader", () => {
    expect(isProfileMediaUrl(url, id)).toBe(true);
    expect(isProfileMediaUrl(url, "other")).toBe(false);
    expect(isProfileMediaUrl(url.replace(".supabase.co", ".supabase.co.evil.com"), id)).toBe(false);
    expect(isProfileMediaUrl("javascript:alert(1)", id)).toBe(false);
    expect(isProfileMediaUrl(url + "?replace=1", id)).toBe(false);
  });
});

describe("profile submissions", () => {
  it("requires a real authenticated consultant", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await submit(request({ bannerUrl: url }))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects forged image sources and malformed input before touching the database", async () => {
    expect((await submit(request({ bannerUrl: "https://evil.com/photo.jpg" }))).status).toBe(422);
    expect((await submit(request({ name: 123 }))).status).toBe(422);
    expect((await submit(request(null))).status).toBe(422);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("stores the banner only in the pending request, never the public profile", async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "request" }, error: null }) }) }));
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }), insert });
    expect((await submit(request({ bannerUrl: url }))).status).toBe(200);
    expect(mocks.from.mock.calls.every(([table]) => table === "profile_change_requests")).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ profile_id: id, banner_url: url, banner_changed: true }));
  });
  it("supports approved banner removal without erasing the photograph", async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "request" }, error: null }) }) }));
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }), insert });
    expect((await submit(request({ bannerUrl: "" }))).status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ banner_url: null, banner_changed: true, photo_url: null }));
  });
});

describe("editorial approval", () => {
  it("consultants cannot approve their own request", async () => {
    expect((await decide(request({ id: "request", decision: "aprovado" }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses one atomic server-only decision for the Super Admin", async () => {
    mocks.session.mockResolvedValue({ demo: false, agent: { id, roleKey: "superadmin" } });
    mocks.rpc.mockResolvedValue({ error: null });
    expect((await decide(request({ id: "request", decision: "aprovado" }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("decide_profile_change", expect.objectContaining({ p_request_id: "request", p_actor_id: id, p_decision: "aprovado" }));
  });
  it("returns a conflict if another decision/cancellation already won", async () => {
    mocks.session.mockResolvedValue({ demo: false, agent: { id, roleKey: "superadmin" } });
    mocks.rpc.mockResolvedValue({ error: { message: "already_decided" } });
    expect((await decide(request({ id: "request", decision: "recusado" }))).status).toBe(409);
  });
});


describe("public property contact links", () => {
  it("normalizes international phone formatting for WhatsApp", async () => {
    const { whatsappLink } = await import("@/lib/format");
    const link = whatsappLink("+351 967-178-288", { reference: "HP0001-05", title: "Apartamento" });
    expect(new URL(link).pathname).toBe("/351967178288");
    expect(new URL(link).searchParams.get("text")).toContain("HP0001-05");
  });
  it("preserves the attributed property URL in the message", async () => {
    const { whatsappLink } = await import("@/lib/format");
    const target = `https://housepro.pt/imovel/real?ref=${id}`;
    expect(new URL(whatsappLink("351967178288", { reference: "HP1", title: "Apartamento" }, target)).searchParams.get("text")).toContain(target);
  });
});
