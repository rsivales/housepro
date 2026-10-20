import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  insert: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  hasServiceRole: () => true,
  createAdminClient: () => ({
    from: () => {
      let writing = false;
      const chain = {
        select: () => chain,
        eq: () => chain,
        update: () => {
          writing = true;
          return chain;
        },
        maybeSingle: () => (writing ? m.write() : m.read()),
        insert: m.insert,
      };
      return chain;
    },
  }),
}));
vi.mock("@/lib/db/property-status", () => ({
  syncPropertyStatusFromDeal: m.sync,
}));
import { advanceDeal } from "./deals";
beforeEach(() => {
  vi.resetAllMocks();
  m.read.mockResolvedValue({
    data: {
      id: "deal",
      property_id: "property",
      stage: "proposta_aceite",
      updated_at: "2026-10-01T00:00:00Z",
    },
  });
  m.write.mockResolvedValue({ data: { id: "deal" }, error: null });
  m.insert.mockResolvedValue({ error: null });
  m.sync.mockResolvedValue(true);
});
describe("Persisted deal movement", () => {
  it("checks persistence and records the event before syncing the real property", async () => {
    expect(
      await advanceDeal("deal", "reserva", "actor", "proposta_aceite"),
    ).toEqual({ ok: true, propertyStatus: "reservado" });
    expect(m.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        from_stage: "proposta_aceite",
        to_stage: "reserva",
        actor_id: "actor",
      }),
    );
    expect(m.sync).toHaveBeenCalledWith("property", "reserva");
  });
  it("does not claim success or alter the property after a failed write", async () => {
    m.write.mockResolvedValue({
      error: { message: "write_failed" },
      data: null,
    });
    expect(await advanceDeal("deal", "reserva", "actor")).toEqual({
      error: "write_failed",
    });
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.sync).not.toHaveBeenCalled();
  });
  it("rejects stale state before writing", async () => {
    expect(await advanceDeal("deal", "reserva", "actor", "cpcv")).toEqual({
      error: "stage_conflict",
    });
    expect(m.write).not.toHaveBeenCalled();
  });
  it("handles concurrent compare-and-set rejection", async () => {
    m.write.mockResolvedValue({ data: null, error: null });
    expect(await advanceDeal("deal", "reserva", "actor")).toEqual({
      error: "stage_conflict",
    });
    expect(m.sync).not.toHaveBeenCalled();
  });
  it("compensates a failed history write without altering property status", async () => {
    m.insert.mockResolvedValue({ error: { message: "audit_failed" } });
    expect(await advanceDeal("deal", "reserva", "actor")).toEqual({
      error: "history_save_failed",
    });
    expect(m.write).toHaveBeenCalledTimes(2);
    expect(m.sync).not.toHaveBeenCalled();
  });
  it("reports a property sync failure explicitly", async () => {
    m.sync.mockResolvedValue(false);
    expect(await advanceDeal("deal", "reserva", "actor")).toMatchObject({
      ok: true,
      propertyStatus: null,
      warning: expect.any(String),
    });
  });
});
