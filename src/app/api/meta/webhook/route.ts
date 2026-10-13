import { NextResponse } from "next/server";

import {
  getVerifyToken,
  verifyWebhookSignature,
  isMetaConfigured,
  maskPII,
  resolvePageToken,
} from "@/lib/meta/secrets";
import {
  getMetaConnection,
  getLeadFormByMetaFormId,
  listCampaigns,
  getFieldMapping,
  listAssignmentRules,
  listAllMetaLeads,
  getPropertyById,
  getAgentPublicById,
  ingestMetaLead,
} from "@/lib/db/repo";
import { normalizeAnswers, buildMetaLead, type RawAnswer } from "@/lib/meta/ingest";
import { resolveAssignment } from "@/lib/meta/assignment";
import { atCapacityAgents } from "@/lib/data/availability";
import { propertiesForCampaign } from "@/lib/data/meta";
import { notifyLeadAssigned } from "@/lib/meta/notify";

/**
 * Webhook do Meta (Lead Ads) — alimenta o motor de atribuição do CRM (Meta >
 * Campanhas / Formulários / Distribuição), já todo configurável em Helix sem
 * precisar de um developer por cada campanha/consultor novo.
 *
 *  GET  → handshake de verificação (hub.mode/hub.verify_token/hub.challenge).
 *  POST → receção de eventos leadgen, com verificação de assinatura HMAC,
 *         obtenção dos dados via Graph API, normalização pelo mapeamento do
 *         formulário e atribuição pela regra da campanha (mesmo caminho do
 *         botão "Gerar lead de teste").
 *
 * SEGURANÇA: só se aceitam pedidos com assinatura válida (X-Hub-Signature-256).
 * Em modo demo (sem segredos configurados) o webhook responde mas NÃO processa
 * nada como real — o fluxo de demonstração usa /api/meta/mock-lead.
 *
 * Um formulário Meta ainda não registado em Formulários & mapeamento não tem
 * campanha/regra para seguir — a lead é guardada na mesma (nunca se perde),
 * mas fica sem pipeline/responsável, no inbox do Meta CRM, até alguém mapear
 * esse formulário e ligá-lo a uma campanha.
 */

// Handshake de verificação da subscrição.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verify = getVerifyToken();
  if (mode === "subscribe" && verify && token === verify && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

interface LeadgenChange {
  value?: { form_id?: string; leadgen_id?: string; page_id?: string };
}
interface WebhookEntry {
  id?: string;
  changes?: LeadgenChange[];
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Sem segredos configurados: modo demo — reconhecemos sem processar.
  if (!isMetaConfigured()) {
    return NextResponse.json({ ok: true, demo: true, processed: 0 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: { entry?: WebhookEntry[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const events: { formId?: string; leadgenId?: string; pageId?: string }[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      events.push({ formId: v.form_id, leadgenId: v.leadgen_id, pageId: v.page_id });
    }
  }

  // Log seguro (sem PII/segredos).
  console.info(
    "[meta:webhook] eventos leadgen:",
    events.map((e) => maskPII(e as Record<string, unknown>))
  );

  const connection = await getMetaConnection();
  const pageToken = resolvePageToken(connection.tokenRef);
  let processed = 0;

  for (const event of events) {
    if (!event.leadgenId) continue;
    const fields = pageToken ? await fetchLeadFields(event.leadgenId, pageToken) : null;
    if (!fields) continue; // sem token/erro na Graph API — o Meta reexpede o evento

    const raw: RawAnswer[] = fields.map((f) => ({ key: f.name ?? "", value: f.values?.[0] ?? "" }));
    const form = event.formId ? await getLeadFormByMetaFormId(event.formId) : undefined;
    const campaign = form?.campaignId ? (await listCampaigns()).find((c) => c.id === form.campaignId) : undefined;
    const mapping = form ? await getFieldMapping(form.id) : undefined;
    const normalized = normalizeAnswers(raw, form, mapping);

    let leadPartial: ReturnType<typeof buildMetaLead>;
    if (campaign) {
      leadPartial = buildMetaLead(campaign, form, normalized);

      const rules = await listAssignmentRules(campaign.id);
      const rule = rules.find((r) => r.active) ?? rules[0];
      let propertyOwnerId: string | undefined;
      if (rule?.strategy === "property") {
        const cp = propertiesForCampaign(campaign.id)[0];
        if (cp) propertyOwnerId = (await getPropertyById(cp.propertyId))?.agentId;
      }
      const allLeads = await listAllMetaLeads();
      // Sem fonte real de disponibilidade (férias/horário) ainda — só o limite diário.
      const atCapacity = atCapacityAgents(allLeads, rule?.dailyLimit);
      const assignment = resolveAssignment({
        campaign,
        rule,
        propertyOwnerId,
        zone: leadPartial.zone,
        budget: leadPartial.budget,
        language: leadPartial.language,
        specialty: leadPartial.specialty,
        atCapacity,
      });
      if (!assignment.unassigned) {
        leadPartial.assignedAgentId = assignment.assignedAgentId;
        leadPartial.assignedTeamId = assignment.assignedTeamId;
        leadPartial.unassigned = false;
      } else if (assignment.offeredTo) {
        leadPartial.offeredTo = assignment.offeredTo;
      }
    } else {
      // Formulário ainda não ligado a nenhuma campanha — guarda a lead na
      // mesma (nunca se perde) mas sem pipeline, para alguém mapear em
      // Meta CRM → Formulários & mapeamento / Campanhas.
      leadPartial = {
        name: normalized.fields.name ?? "Sem nome",
        contact: normalized.fields.contact ?? "",
        email: normalized.fields.email,
        message:
          (normalized.fields.message ?? "") +
          (form ? "" : `\n[Formulário Meta ${event.formId} ainda não registado em Formulários & mapeamento.]`),
        source: "facebook",
        status: "novo",
        formId: form?.id,
        unassigned: true,
        qualification: "novo",
        createdAt: new Date().toISOString(),
      };
    }
    leadPartial.externalId = event.leadgenId;

    const lead = await ingestMetaLead({ lead: leadPartial, answers: normalized.answers });
    if (lead.assignedAgentId) {
      const assignedAgent = await getAgentPublicById(lead.assignedAgentId);
      await notifyLeadAssigned({
        lead,
        agentId: lead.assignedAgentId,
        agentName: assignedAgent?.name,
        agentEmail: assignedAgent?.email,
        campaignName: campaign?.name,
      });
    }
    processed++;
  }

  return NextResponse.json({ ok: true, received: events.length, processed });
}

interface GraphFieldDatum {
  name?: string;
  values?: string[];
}

/** Dados do titular da lead via Graph API (GET /{leadgen_id}), server-side. */
async function fetchLeadFields(leadgenId: string, pageToken: string): Promise<GraphFieldDatum[] | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${pageToken}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { field_data?: GraphFieldDatum[] };
    return data.field_data ?? null;
  } catch {
    return null;
  }
}
