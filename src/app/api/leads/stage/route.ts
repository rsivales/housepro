import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { META_PIPELINES } from "@/lib/data/meta";
import { updateLeadStage } from "@/lib/db/repo";

/**
 * Move uma lead de etapa no pipeline (Kanban).
 *  POST { leadId, stage, pipeline? }
 * Em demo devolve ok sem persistir.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: { leadId?: string; stage?: number; pipeline?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const pipeline = META_PIPELINES.find((p) => p.key === body?.pipeline);
  const stage = body?.stage;
  if (!body?.leadId || typeof stage !== "number" || !Number.isInteger(stage) ||
      stage < 0 || stage >= (pipeline?.stages.length ?? 11) ||
      (body.pipeline !== undefined && !pipeline) ||
      (!session.demo && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.leadId))) {
    return NextResponse.json({ error: "Faltam leadId ou stage." }, { status: 400 });
  }

  if (session.demo) return NextResponse.json({ ok: true, demo: true });

  const ok = await updateLeadStage({
    leadId: String(body.leadId),
    stage,
    pipeline: body.pipeline,
    actor: session.agent,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
