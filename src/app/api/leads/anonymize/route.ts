import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { anonymizeLead } from "@/lib/db/repo";

/**
 * RGPD — anonimiza uma lead (direito ao apagamento). Remove os dados pessoais
 * mantendo a lead para estatística. Só staff (fora de demo).
 *  POST { leadId }
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
      { error: "Apenas a coordenação/direção pode anonimizar leads." },
      { status: 403 }
    );
  }

  let body: { leadId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.leadId) {
    return NextResponse.json({ error: "Falta leadId." }, { status: 400 });
  }

  const ok = await anonymizeLead({
    leadId: String(body.leadId),
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "anonymize_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
