import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import {
  listCampaigns,
  listLeadForms,
  getFieldMapping,
  ingestMetaLead,
} from "@/lib/db/repo";
import {
  sampleAnswersForForm,
  normalizeAnswers,
  buildMetaLead,
  type RawAnswer,
} from "@/lib/meta/ingest";

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
  const lead = await ingestMetaLead({ lead: leadPartial, answers: normalized.answers });

  return NextResponse.json({ lead, demo: session.demo });
}
