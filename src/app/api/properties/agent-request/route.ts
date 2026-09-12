import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** Um agente pede para entrar num imóvel (co-angariação). Fica pendente até o
 *  broker/coordenação aprovar. POST { propertyId } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { propertyId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const propertyId = String(body.propertyId ?? "").trim();
  if (!propertyId) return NextResponse.json({ error: "property_missing" }, { status: 400 });

  const property = await getPropertyById(propertyId);
  if (!property) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Já é o angariador ou co-angariador?
  if (
    property.agentId === session.agent.id ||
    (property.coAgentIds ?? []).includes(session.agent.id)
  ) {
    return NextResponse.json({ error: "already_agent" }, { status: 400 });
  }

  if (!hasServiceRole()) return NextResponse.json({ ok: true, demo: true });

  const sb = createAdminClient();
  const { error } = await sb
    .from("property_agent_requests")
    .upsert(
      { property_id: propertyId, requester_id: session.agent.id, status: "pendente", decided_by: null, decided_at: null },
      { onConflict: "property_id,requester_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
