import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { assignLead } from "@/lib/db/repo";
import { agents } from "@/lib/data/mock";

/**
 * Atribui/reatribui uma lead a um consultor específico (obrigatório indicar o
 * consultor). Permitido a staff e ao próprio responsável/origem (RLS reforça).
 *  POST { leadId, agentId, reassign?, note? }
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
      { error: "Apenas a coordenação/direção pode distribuir leads." },
      { status: 403 }
    );
  }

  let body: { leadId?: string; agentId?: string; reassign?: boolean; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.leadId || !body.agentId) {
    return NextResponse.json(
      { error: "É obrigatório indicar a lead e o consultor específico." },
      { status: 400 }
    );
  }

  const agentName = agents.find((a) => a.id === body.agentId)?.name;

  const ok = await assignLead({
    leadId: String(body.leadId),
    agentId: String(body.agentId),
    agentName,
    reassign: Boolean(body.reassign),
    note: body.note,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "assign_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, agentName, demo: session.demo });
}
