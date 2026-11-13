import "server-only";
import type { Agent } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_PIPELINES, type LeadPipeline } from "@/lib/data/lead-pipelines";

export async function crmLeadPipelines(agent: Agent, demo: boolean): Promise<LeadPipeline[]> {
  if (demo || !agent.agencyId) return LEAD_PIPELINES;
  const { data, error } = await createAdminClient().from("crm_lead_pipelines")
    .select("id,name,stages").eq("agency_id", agent.agencyId).order("created_at");
  // Deployment may precede the additive migration. The built-in boards still work.
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return LEAD_PIPELINES;
    throw new Error("crm_lead_pipelines_read_failed");
  }
  return [...LEAD_PIPELINES, ...(data ?? []).map((row) => ({
    key: `custom:${row.id}`, label: row.name, stages: row.stages,
  }))];
}
