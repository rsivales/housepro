import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * A coordenação/administração aprova ou recusa um pedido de alteração de
 * perfil. Ao aprovar, os campos propostos (só os que foram pedidos) são
 * aplicados a `profiles`. POST { id, decision: "aprovado" | "recusado", note? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo || !isStaff(session.agent)) {
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
  const { data: reqRow, error: reqErr } = await admin
    .from("profile_change_requests")
    .select("id, profile_id, name, photo_url, whatsapp, status")
    .eq("id", id)
    .single();
  if (reqErr || !reqRow) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (reqRow.status !== "pendente") return NextResponse.json({ error: "already_decided" }, { status: 409 });

  if (decision === "aprovado") {
    const patch: Record<string, string> = {};
    if (reqRow.name) patch.name = reqRow.name;
    if (reqRow.photo_url) patch.photo_url = reqRow.photo_url;
    if (reqRow.whatsapp) patch.whatsapp = reqRow.whatsapp;
    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await admin.from("profiles").update(patch).eq("id", reqRow.profile_id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("profile_change_requests")
    .update({ status: decision, note: body.note ?? null, decided_by: session.agent.id, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
