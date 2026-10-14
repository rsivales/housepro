import type { Agent } from "./types";

/** Brand-only super administrators manage the system without representing clients. */
export function isCommercialAgent(a: Pick<Agent, "roleKey" | "publicTitle">): boolean {
  return a.roleKey !== "advogado" && (a.roleKey !== "superadmin" || Boolean(a.publicTitle?.trim()));
}
