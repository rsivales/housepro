import "server-only";
import type { Agent } from "@/lib/data/types";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { agencyWorkspaces } from "./agency-finance";
import { createAdminClient } from "@/lib/supabase/admin";

export async function helixFeesWorkspace(agent: Agent) {
  const master = isNetworkFinanceAdmin(agent);
  const managed = await agencyWorkspaces(agent);
  const agencyIds = managed.map((a) => a.id);
  const sb = createAdminClient();
  let profiles = sb.from("profiles").select("id,name,agency_id,pro_producer_since").eq("active", true).order("name");
  if (!master) profiles = agencyIds.length ? profiles.in("agency_id", agencyIds) : profiles.eq("id", agent.id);
  const scope = `agent_id.eq.${agent.id}${agencyIds.length ? `,agency_id.in.(${agencyIds.join(",")})` : ""}`;
  let requests = sb.from("pro_producer_requests").select("id,agency_id,agent_id,status,created_at,decided_at").order("created_at", { ascending: false }).limit(100);
  let plans = sb.from("helix_fee_plans").select("id,agency_id,agent_id,amount,starts_on,stopped_at").order("created_at", { ascending: false }).limit(100);
  let charges = sb.from("helix_fee_charges").select("id,agency_id,agent_id,creditor,kind,month,amount,status").order("month", { ascending: false }).limit(100);
  if (!master) { requests = requests.or(scope); plans = plans.or(scope); charges = charges.or(scope); }
  const result = await Promise.all([profiles, requests, plans, charges]);
  if (result.some((r) => r.error)) throw new Error("As tabelas de fees ainda não estão disponíveis.");
  return {
    master, managed,
    profiles: result[0].data ?? [], requests: result[1].data ?? [],
    plans: result[2].data ?? [], charges: result[3].data ?? [],
  };
}
export type HelixFeesWorkspace = Awaited<ReturnType<typeof helixFeesWorkspace>>;
