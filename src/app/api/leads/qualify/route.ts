import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { qualifyLead } from "@/lib/db/repo";
import type { LeadQualification } from "@/lib/data/leads";

/**
 * Qualifica/desqualifica uma lead Meta.
 *  POST { leadId, qualification, score?, note? }
 * Permitido ao responsável/origem da lead e a staff (a RLS reforça no servidor).
 * Em demo devolve ok sem persistir.
 */

const VALID: LeadQualification[] = ["novo", "qualificado", "desqualificado", "duplicado"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  let body: { leadId?: string; qualification?: LeadQualification; score?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.leadId || !body.qualification || !VALID.includes(body.qualification)) {
    return NextResponse.json({ error: "Faltam leadId ou qualificação válida." }, { status: 400 });
  }

  const ok = await qualifyLead({
    leadId: String(body.leadId),
    qualification: body.qualification,
    score: typeof body.score === "number" ? body.score : undefined,
    note: body.note,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
