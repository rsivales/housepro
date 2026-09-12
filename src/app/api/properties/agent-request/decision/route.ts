import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** O broker/coordenação aprova ou recusa um pedido de co-angariação. Ao aprovar,
 *  o agente é adicionado a properties.co_agent_ids. POST { requestId, decision } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  if (!isStaff(session.agent)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  let body: { requestId?: string; decision?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const requestId = String(body.requestId ?? "").trim();
  const decision = body.decision === "aprovado" ? "aprovado" : body.decision === "recusado" ? "recusado" : "";
  if (!requestId || !decision) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (!hasServiceRole()) return NextResponse.json({ ok: true, demo: true });

  const sb = createAdminClient();
  const { data: reqRow } = await sb
    .from("property_agent_requests")
    .select("id, property_id, requester_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!reqRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await sb
    .from("property_agent_requests")
    .update({ status: decision, decided_by: session.agent.id, decided_at: new Date().toISOString() })
    .eq("id", requestId);

  if (decision === "aprovado") {
    const { data: prop } = await sb
      .from("properties")
      .select("co_agent_ids")
      .eq("id", reqRow.property_id)
      .maybeSingle();
    const current = Array.isArray(prop?.co_agent_ids) ? (prop!.co_agent_ids as string[]) : [];
    if (!current.includes(String(reqRow.requester_id))) {
      await sb
        .from("properties")
        .update({ co_agent_ids: [...current, reqRow.requester_id] })
        .eq("id", reqRow.property_id);
    }
  }

  return NextResponse.json({ ok: true });
}
