import type { Agent } from "@/lib/data/types";
import { isStaff } from "@/lib/data/roles";
export function dealTeamOrStaffAllowed(
  agent: Agent,
  gate: { agencyId: string; team: string[] },
) {
  if (gate.team.includes(agent.id)) return true;
  const role = agent.roleKey ?? agent.role;
  return (
    isStaff(agent) &&
    (["superadmin", "admin"].includes(role ?? "") ||
      (!!agent.agencyId && agent.agencyId === gate.agencyId))
  );
}
