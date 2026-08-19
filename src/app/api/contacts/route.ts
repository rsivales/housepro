import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createContact, listContactsByOwner } from "@/lib/db/repo";
import type { ContactType } from "@/lib/data/contacts";

/**
 * Contactos do consultor.
 *  GET  → contactos do próprio.
 *  POST → cria um contacto. Em demo devolve o objeto sem persistir.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const contacts = await listContactsByOwner(session.agent.id);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: {
    name?: string;
    phone?: string;
    email?: string;
    type?: ContactType;
    zone?: string;
    budget?: string;
    language?: string;
    source?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.name) {
    return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
  }

  const contact = await createContact({
    name: String(body.name),
    phone: body.phone,
    email: body.email,
    type: body.type ?? "outro",
    ownerId: session.agent.id,
    agencyId: session.agent.agencyId || undefined,
    zone: body.zone,
    budget: body.budget,
    language: body.language,
    source: body.source ?? "manual",
  });
  return NextResponse.json({ contact, demo: session.demo });
}
