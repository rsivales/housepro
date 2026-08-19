import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createVisit } from "@/lib/db/repo";
import type { VisitKind } from "@/lib/data/contacts";

/**
 * Agenda — cria uma visita/evento.
 *  POST { kind, at, contactId?, contactName?, propertyRef?, durationMin?, note? }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    kind?: VisitKind;
    at?: string;
    contactId?: string;
    contactName?: string;
    propertyRef?: string;
    durationMin?: number;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.at) return NextResponse.json({ error: "A data/hora é obrigatória." }, { status: 400 });

  const visit = await createVisit({
    ownerId: session.agent.id,
    kind: body.kind ?? "visita",
    at: String(body.at),
    contactId: body.contactId,
    contactName: body.contactName,
    propertyRef: body.propertyRef,
    durationMin: body.durationMin,
    note: body.note,
  });
  return NextResponse.json({ visit, demo: session.demo });
}
