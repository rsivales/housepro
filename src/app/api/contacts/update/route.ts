export const maxDuration = 120;
import { after } from "next/server";
import { validateBuyerProfile } from "@/lib/matching/profile";
import { runMatching } from "@/lib/matching/server";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { getContact, updateContact } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import type { ContactType } from "@/lib/data/contacts";

/** Edita um contacto existente — dono do contacto ou staff (coordenação/
 *  direção/admin). POST { id, patch: { nome, telefone, tipo, nif, ... } } */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.viewingAs || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { id?: string; patch?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  if (!id || !body.patch) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const current = await getContact(id);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (current.ownerId !== session.agent.id && !isStaff(session.agent)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  const p = body.patch;
  let buyerProfile;
  if ("buyerProfile" in p) { try { buyerProfile = validateBuyerProfile(p.buyerProfile); } catch(e) { return NextResponse.json({error:e instanceof Error ? e.message : "Qualificação inválida."},{status:422}); } }
  const res = await updateContact(id, {
    ...(buyerProfile ? {buyerProfile} : {}),
    ...(typeof p.name === "string" ? { name: p.name } : {}),
    ...("phone" in p ? { phone: (p.phone as string) || null } : {}),
    ...("email" in p ? { email: (p.email as string) || null } : {}),
    ...(typeof p.type === "string" ? { type: p.type as ContactType } : {}),
    ...("zone" in p ? { zone: (p.zone as string) || null } : {}),
    ...("budget" in p ? { budget: (p.budget as string) || null } : {}),
    ...("language" in p ? { language: (p.language as string) || null } : {}),
    ...("nif" in p ? { nif: (p.nif as string) || null } : {}),
    ...("idDocument" in p ? { idDocument: (p.idDocument as string) || null } : {}),
    ...("address" in p ? { address: (p.address as string) || null } : {}),
    ...("birthDate" in p ? { birthDate: (p.birthDate as string) || null } : {}),
  });
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  after(async () => { await runMatching({ contactId: id }); });
  return NextResponse.json(res);
}
