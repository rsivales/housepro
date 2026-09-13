import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { ensureOwnerToken } from "@/lib/db/owner-portal";

/** Gera (ou devolve) o link do portal do proprietário para um imóvel.
 *  Reservado ao angariador, co-angariador ou staff. POST { propertyId } */
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

  const a = session.agent;
  const allowed = property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id) || isStaff(a);
  if (!allowed) return NextResponse.json({ error: "sem_permissao" }, { status: 403 });

  const token = await ensureOwnerToken(propertyId);
  if (!token) return NextResponse.json({ error: "token_failed" }, { status: 400 });

  return NextResponse.json({ ok: true, path: `/proprietario/${token}` });
}
