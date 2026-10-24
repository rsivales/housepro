import type { Agent } from "./types";
export function canReadLead(agent: Agent, lead: { owner_id?: string | null; assigned_agent_id?: string | null; co_owner_ids?: string[] | null; agency_id?: string | null }) {
  if ([lead.owner_id, lead.assigned_agent_id, ...(lead.co_owner_ids ?? [])].includes(agent.id)) return true;
  return Boolean(lead.agency_id && lead.agency_id === agent.agencyId &&
    ["coordenador", "diretor", "admin", "superadmin"].includes(agent.roleKey ?? ""));
}
