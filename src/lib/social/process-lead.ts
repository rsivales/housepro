import type { SocialProvider, Campaign, LeadForm } from "@/lib/data/meta";
import type { Lead } from "@/lib/data/leads";
import {
  getFieldMapping,
  listAssignmentRules,
  listAllMetaLeads,
  ingestSocialLead,
} from "@/lib/db/repo";
import { normalizeAnswers, buildSocialLead, type RawAnswer } from "@/lib/meta/ingest";
import { resolveAssignment } from "@/lib/meta/assignment";
import { unavailableAgents, atCapacityAgents, demoAvailability } from "@/lib/data/availability";
import { agents } from "@/lib/data/mock";
import { notifyLeadAssigned } from "@/lib/meta/notify";

export interface ProcessSocialLeadInput {
  provider: SocialProvider;
  campaign: Campaign;
  form?: LeadForm;
  externalLeadId: string;
  answers: RawAnswer[];
  trustedWebhook?: boolean;
}

/** Pipeline único para Meta e TikTok: normalização, deduplicação, regra de
 * distribuição, persistência, auditoria e notificação. */
export async function processSocialLead(input: ProcessSocialLeadInput): Promise<{
  lead: Lead;
  assignment: ReturnType<typeof resolveAssignment>;
}> {
  const mapping = input.form
    ? await getFieldMapping(input.form.id, { trustedWebhook: input.trustedWebhook })
    : undefined;
  const normalized = normalizeAnswers(input.answers, input.form, mapping);
  const partial = buildSocialLead(input.campaign, input.form, normalized, input.provider);
  partial.externalId = input.externalLeadId;

  const rules = await listAssignmentRules(input.campaign.id, {
    trustedWebhook: input.trustedWebhook,
  });
  const rule = rules.find((r) => r.active) ?? rules[0];
  const existing = await listAllMetaLeads(undefined, {
    trustedWebhook: input.trustedWebhook,
  });
  const assignment = resolveAssignment({
    campaign: input.campaign,
    rule,
    zone: partial.zone,
    budget: partial.budget,
    language: partial.language,
    specialty: partial.specialty,
    unavailable: unavailableAgents(demoAvailability),
    atCapacity: atCapacityAgents(existing, rule?.dailyLimit),
  });

  if (!assignment.unassigned) {
    partial.assignedAgentId = assignment.assignedAgentId;
    partial.assignedTeamId = assignment.assignedTeamId;
    partial.unassigned = false;
  } else if (assignment.offeredTo) {
    partial.offeredTo = assignment.offeredTo;
  }

  const lead = await ingestSocialLead({
    lead: partial,
    answers: normalized.answers,
    provider: input.provider,
    trustedWebhook: input.trustedWebhook,
  });

  if (lead.assignedAgentId) {
    const agent = agents.find((a) => a.id === lead.assignedAgentId);
    await notifyLeadAssigned({
      lead,
      agentId: lead.assignedAgentId,
      agentName: agent?.name,
      agentEmail: agent?.email,
      campaignName: input.campaign.name,
    });
  }

  return { lead, assignment };
}
