import "server-only";
import type { Agent } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";

import { canReadLead, leadAccessScope } from "@/lib/data/lead-access";

export async function visibleLeadRows(agent: Agent, id?: string) {
  let query = createAdminClient().from("leads").select("*, property:properties!property_id(reference,title)").order("created_at", { ascending: false });
  if (id) query = query.eq("id", id);
  const { data, error } = await query.or(leadAccessScope(agent));
  if (error) throw new Error("lead_read_failed");
  return (data ?? []).filter(lead => canReadLead(agent, lead));
}

// Call only after authorizing access to the parent lead.
export async function readLeadAnswers(leadId: string) {
  const { data, error } = await createAdminClient().from("lead_answers")
    .select("question_key,label,value").eq("lead_id", leadId)
    .order("created_at", { ascending: true }).order("id", { ascending: true });
  return { answers: data ?? [], unavailable: Boolean(error) };
}
