import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
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
  if (!body.leadId || typeof body.stage !== "number") {
    return NextResponse.json({ error: "Faltam leadId ou stage." }, { status: 400 });
  }

  const ok = await updateLeadStage({
    leadId: String(body.leadId),
    stage: body.stage,
    pipeline: body.pipeline,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
