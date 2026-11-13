import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOM_PIPELINE_KEY, LEAD_PIPELINES, validPipelineSettings } from "@/lib/data/lead-pipelines";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isStaff(session.agent)) return NextResponse.json({ error: "Sem acesso ao CRM." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!validPipelineSettings(body?.name, body?.stages) ||
      (body.key !== undefined && (typeof body.key !== "string" || !CUSTOM_PIPELINE_KEY.test(body.key)))) {
    return NextResponse.json({ error: "Indique um nome e entre 2 e 12 etapas com nomes distintos." }, { status: 400 });
  }
  const name = (body.name as string).trim();
  const stages = (body.stages as string[]).map((s) => s.trim());
  if (LEAD_PIPELINES.some((p) => p.label.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Já existe um pipeline com esse nome." }, { status: 409 });
  }
  if (session.demo) return NextResponse.json({ key: body.key ?? `custom:${crypto.randomUUID()}`, label: name, stages, demo: true });
  const agency = session.agent.agencyId;
  if (!agency) return NextResponse.json({ error: "Não tem uma agência associada." }, { status: 403 });
  const sb = createAdminClient();
  if (body.key) {
    const { data, error } = await sb.from("crm_lead_pipelines").select("stages")
      .eq("id", body.key.slice(7)).eq("agency_id", agency).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Pipeline indisponível." }, { status: 404 });
    if (stages.length < data.stages.length) {
      return NextResponse.json({ error: "Pode editar os nomes das etapas e acrescentar novas. Não é possível remover etapas com esta opção." }, { status: 400 });
    }
    // Guard against concurrent edits changing the stage count between read and update.
    const result = await sb.from("crm_lead_pipelines").update({ name, stages })
      .eq("id", body.key.slice(7)).eq("agency_id", agency).filter("stages", "eq", `{${(data.stages as string[]).map((stage) => JSON.stringify(stage)).join(",")}}`)
      .select("id,name,stages").maybeSingle();
    if (result.error || !result.data) return NextResponse.json({ error: result.error?.code === "23505" ? "Já existe um pipeline com esse nome." : "Não foi possível guardar. Atualize a página e tente novamente." }, { status: 409 });
    return NextResponse.json({ key: body.key, label: result.data.name, stages: result.data.stages });
  }
  const { data, error } = await sb.from("crm_lead_pipelines").insert({ agency_id: agency, name, stages }).select("id,name,stages").single();
  if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "Já existe um pipeline com esse nome." : "Não foi possível criar o pipeline." }, { status: error?.code === "23505" ? 409 : 503 });
  return NextResponse.json({ key: `custom:${data.id}`, label: data.name, stages: data.stages });
}
