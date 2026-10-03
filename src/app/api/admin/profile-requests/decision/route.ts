import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * O Super Admin aprova ou recusa um pedido de alteração de perfil — só ele,
 * mesmo que quem submeteu seja broker/diretor. Ao aprovar, os campos
 * propostos (só os que foram pedidos) são aplicados a `profiles`.
 * POST { id, decision: "aprovado" | "recusado", note? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || !isSuperadmin(session.agent)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "service_role_missing" }, { status: 501 });

  let body: { id?: string; decision?: "aprovado" | "recusado"; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  const decision = body.decision;
  if (!id || (decision !== "aprovado" && decision !== "recusado")) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("decide_profile_change", {
    p_request_id: id,
    p_actor_id: session.agent.id,
    p_decision: decision,
    p_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
  });
  if (error) {
    const status = /already_decided/.test(error.message) ? 409 : /not_found/.test(error.message) ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
