import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { getContact } from "@/lib/db/repo";
import { ensureBuyerPortalToken } from "@/lib/db/buyer-portal";

/** Gera (ou devolve) o link do portal do comprador para um contacto.
 *  Reservado ao dono do contacto ou staff. POST { contactId } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { contactId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const contactId = String(body.contactId ?? "").trim();
  if (!contactId) return NextResponse.json({ error: "contact_missing" }, { status: 400 });

  const contact = await getContact(contactId);
  if (!contact) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const a = session.agent;
  const allowed = contact.ownerId === a.id || isStaff(a);
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const token = await ensureBuyerPortalToken(contactId);
  if (!token) return NextResponse.json({ error: "token_failed" }, { status: 400 });

  return NextResponse.json({ ok: true, path: `/comprador/${token}` });
}
