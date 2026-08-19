import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { addContactActivity } from "@/lib/db/repo";
import type { ActivityType } from "@/lib/data/contacts";

/**
 * Acrescenta um evento à cronologia única de um contacto.
 *  POST { contactId, type, title, body?, direction? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    contactId?: string;
    type?: ActivityType;
    title?: string;
    body?: string;
    direction?: "in" | "out";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.contactId || !body.title) {
    return NextResponse.json({ error: "Faltam contactId ou título." }, { status: 400 });
  }

  const ok = await addContactActivity({
    contactId: String(body.contactId),
    type: body.type ?? "note",
    title: String(body.title),
    body: body.body,
    direction: body.direction,
    actorId: session.demo ? undefined : session.agent.id,
    actorName: session.agent.name,
  });
  if (!ok) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, demo: session.demo });
}
