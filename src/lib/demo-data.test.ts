import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("real production data", () => {
  it.each(["true", "false"])("never exposes example agents or agencies in production with demo flag %s", async (flag) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", flag);
    vi.resetModules();
    const { agents, agencies, properties, agentById } = await import("./data/mock");
    expect(agents).toEqual([]);
    expect(agencies).toEqual([]);
    expect(properties).toEqual([]);
    expect(agentById("missing-real-profile").name).toBe("Consultor indisponível");
    const { mockReferrals, demoTrackedReferrals, agencyForMunicipality } = await import("./data/referrals");
    expect(mockReferrals).toEqual([]);
    expect(demoTrackedReferrals).toEqual([]);
    expect(agencyForMunicipality("Faro")).toBe("");
  });

  it("routes client referrals using actual agency IDs rather than prototype slugs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { agencyForMunicipality } = await import("./data/referrals");
    const real = [{ id: "real-agency-id", name: "HousePro Prestige", slug: "housepro", region: "Algarve" }];
    expect(agencyForMunicipality("Faro", real)).toBe("real-agency-id");
  });

  it("keeps example data available for isolated tests", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.resetModules();
    const { agents } = await import("./data/mock");
    expect(agents.some((a) => a.id === "ana")).toBe(true);
  });
});
