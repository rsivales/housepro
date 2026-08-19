import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import {
  listCampaigns,
  listLeadForms,
  getFieldMapping,
  listAssignmentRules,
  getPropertyById,
  ingestMetaLead,
} from "@/lib/db/repo";
import {
  sampleAnswersForForm,
  normalizeAnswers,
  buildMetaLead,
  type RawAnswer,
} from "@/lib/meta/ingest";
import { resolveAssignment } from "@/lib/meta/assignment";
import { propertiesForCampaign } from "@/lib/data/meta";
import { agents } from "@/lib/data/mock";
import { notifyLeadAssigned } from "@/lib/meta/notify";

/**
 * Gera uma LEAD DE TESTE e corre-a pelo mesmo pipeline de ingestão das leads
 * reais (normalização via mapeamento → criação → atividade). Serve para
 * demonstrar o módulo sem credenciais Meta. Permitido em demo ou a staff.
 *
 *  POST { campaignId, formId? } → { lead }
 */

const STAFF = ["coordenador", "diretor", "admin", "superadmin"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const roleKey = session.agent.roleKey ?? "";
  const canManage = STAFF.includes(roleKey) || session.agent.role === "admin";
  if (!session.demo && !canManage) {
    return NextResponse.json(
      { error: "Apenas staff pode gerar leads de teste." },
      { status: 403 }
    );
  }

  let body: { campaignId?: string; formId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.campaignId) {
    return NextResponse.json({ error: "Falta campaignId." }, { status: 400 });
  }

  const campaigns = await listCampaigns();
  const campaign = campaigns.find((c) => c.id === body.campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  const forms = await listLeadForms(campaign.id);
  const form = body.formId ? forms.find((f) => f.id === body.formId) : forms[0];
  const mapping = form ? await getFieldMapping(form.id) : undefined;

  const raw: RawAnswer[] = form
    ? sampleAnswersForForm(form)
    : [
        { key: "full_name", value: "Lead de Teste" },
        { key: "phone_number", value: "351900000000" },
      ];

  const normalized = normalizeAnswers(raw, form, mapping);
  const leadPartial = buildMetaLead(campaign, form, normalized);
  // Chave de idempotência simulada (num evento real vem o leadgen_id do Meta).
  leadPartial.externalId = `mock-${campaign.id}-${Date.now()}`;

  // Aplicar a regra de atribuição da campanha (motor de atribuição).
  const rules = await listAssignmentRules(campaign.id);
  const rule = rules.find((r) => r.active) ?? rules[0];
  let propertyOwnerId: string | undefined;
  if (rule?.strategy === "property") {
    const cp = propertiesForCampaign(campaign.id)[0];
    if (cp) {
      const prop = await getPropertyById(cp.propertyId);
      propertyOwnerId = prop?.agentId;
    }
  }
  const assignment = resolveAssignment({
    campaign,
    rule,
    propertyOwnerId,
    zone: leadPartial.zone,
    budget: leadPartial.budget,
    language: leadPartial.language,
    specialty: leadPartial.specialty,
  });
  if (!assignment.unassigned) {
    leadPartial.assignedAgentId = assignment.assignedAgentId;
    leadPartial.assignedTeamId = assignment.assignedTeamId;
    leadPartial.unassigned = false;
  } else if (assignment.offeredTo) {
    // "Primeiro a aceitar": fica no inbox, oferecida ao conjunto.
    leadPartial.offeredTo = assignment.offeredTo;
  }

  const lead = await ingestMetaLead({ lead: leadPartial, answers: normalized.answers });
  const assignedAgent = agents.find((a) => a.id === lead.assignedAgentId);
  const assignedName = assignedAgent?.name;

  // Comunicação ao consultor quando a lead nasce já atribuída (best-effort).
  if (lead.assignedAgentId) {
    await notifyLeadAssigned({
      lead,
      agentId: lead.assignedAgentId,
      agentName: assignedName,
      agentEmail: assignedAgent?.email,
      campaignName: campaign.name,
    });
  }

  return NextResponse.json({
    lead,
    assignment: { ...assignment, assignedName },
    demo: session.demo,
  });
}
