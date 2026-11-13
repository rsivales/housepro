import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmLeadPipelines } from "@/lib/db/crm-lead-pipelines";
import { leadAccessScope } from "@/lib/data/lead-access";
import { CUSTOM_PIPELINE_KEY, hasPipelinePhone } from "@/lib/data/lead-pipelines";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.agent.roleKey === "advogado") return NextResponse.json({ error: "Sem acesso ao CRM." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.leadId !== "string" || (!session.demo && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.leadId))) {
    return NextResponse.json({ error: "Lead inválida." }, { status: 400 });
  }
  if (session.demo) return NextResponse.json({ ok: true, demo: true });
  const { agent } = session;
  const sb = createAdminClient();
  const scope = leadAccessScope(agent);
  const { data: lead, error: readError } = await sb.from("leads").select("contact,agency_id")
    .eq("id", body.leadId).or(scope).maybeSingle();
  if (readError) return NextResponse.json({ error: "Não foi possível carregar a lead." }, { status: 503 });
  if (!lead) return NextResponse.json({ error: "Lead indisponível." }, { status: 404 });
  let patch: Record<string, unknown>;
  if (typeof body.archived === "boolean") {
    patch = { crm_archived_at: body.archived ? new Date().toISOString() : null };
  } else {
    if (!hasPipelinePhone(lead.contact)) return NextResponse.json({ error: "Esta lead não tem um telefone válido." }, { status: 422 });
    const pipeline = (await crmLeadPipelines(agent, false)).find((p) => p.key === body.pipeline);
    if (!pipeline || !Number.isInteger(body.stage) || body.stage < 0 || body.stage >= pipeline.stages.length ||
        (CUSTOM_PIPELINE_KEY.test(pipeline.key) && lead.agency_id !== agent.agencyId)) {
      return NextResponse.json({ error: "Pipeline ou etapa indisponível." }, { status: 400 });
    }
    patch = { pipeline: pipeline.key, stage: body.stage };
  }
  const { data, error } = await sb.from("leads").update(patch).eq("id", body.leadId).or(scope).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Não foi possível guardar a alteração." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
