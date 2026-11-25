import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientPortalProfile, setPortalRole, type PortalRole } from "@/lib/db/client-portal";

const ROLES: PortalRole[] = ["comprador", "vendedor", "investidor"];

/** Escolha do papel de portal no registo/primeiro acesso — um só, nunca os
 *  três ao mesmo tempo. Pode ser alterado mais tarde a pedido do próprio. */
export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.role || !ROLES.includes(body.role as PortalRole))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const profile = await getClientPortalProfile(user.id, user.email);
  if (!profile)
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });

  const res = await setPortalRole(profile.contactId, body.role as PortalRole);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true, role: body.role });
}
