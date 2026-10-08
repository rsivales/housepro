import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { searchContacts } from "@/lib/db/repo";
import type { ContactType } from "@/lib/data/contacts";

/** Pesquisa contactos (qualquer consultor, qualquer dono) por nome/e-mail/
 *  telefone — para ligar um negócio a um comprador já existente, incluindo
 *  quem se autorregistou em /cliente/entrar e ainda não tem consultor.
 *  GET ?q=<texto>&type=comprador */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.demo) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const type = (url.searchParams.get("type") as ContactType | null) ?? undefined;

  const contacts = await searchContacts(q, type);
  return NextResponse.json({
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, claimed: Boolean(c.ownerId) })),
  });
}
