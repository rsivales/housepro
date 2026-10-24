import "server-only";
import type { Agent } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";

import { canReadLead } from "@/lib/data/lead-access";

export async function visibleLeadRows(agent: Agent, id?: string) {
  const sb = createAdminClient();
  let query = sb.from("leads").select("*, property:properties!property_id(reference,title)").order("created_at", { ascending: false });
  if (id) query = query.eq("id", id);
  const staff = ["coordenador", "diretor", "admin", "superadmin"].includes(agent.roleKey ?? "");
  // Filter at the database and recheck each row. Never send other agencies' data.
  const scope = [`owner_id.eq.${agent.id}`, `assigned_agent_id.eq.${agent.id}`, `co_owner_ids.cs.{${agent.id}}`];
  if (staff && agent.agencyId) scope.push(`agency_id.eq.${agent.agencyId}`);
  const { data, error } = await query.or(scope.join(","));
  if (error) throw new Error("lead_read_failed");
  return (data ?? []).filter(lead => canReadLead(agent, lead));
}
