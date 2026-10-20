import { describe, it, expect } from "vitest";
import { dealTeamOrStaffAllowed } from "./deal-permissions";
import type { Agent } from "@/lib/data/types";
const actor = (roleKey: string, agencyId = "a") =>
  ({ id: "self", agencyId, roleKey, role: "agente" }) as Agent;
const gate = { agencyId: "a", team: ["producer"] };
describe("Deal staff scope", () => {
  it("allows network administration and agency management in its own agency", () => {
    expect(dealTeamOrStaffAllowed(actor("superadmin", "b"), gate)).toBe(true);
    expect(dealTeamOrStaffAllowed(actor("diretor"), gate)).toBe(true);
  });
  it("blocks unrelated consultants and management of another agency", () => {
    expect(dealTeamOrStaffAllowed(actor("agente"), gate)).toBe(false);
    expect(dealTeamOrStaffAllowed(actor("diretor", "b"), gate)).toBe(false);
  });
  it("keeps explicit transaction team access", () => {
    expect(
      dealTeamOrStaffAllowed(actor("agente"), { ...gate, team: ["self"] }),
    ).toBe(true);
  });
});
