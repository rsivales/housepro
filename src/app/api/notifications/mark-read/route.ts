import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { markNotificationsRead } from "@/lib/db/repo";

/** Marca notificações como lidas. POST { ids?: string[] } — sem `ids`, marca
 *  todas as não lidas do consultor autenticado. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { ids?: string[] } = {};
  try {
    body = await request.json();
  } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }

  if (!body || (body.ids !== undefined && (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 ||
    body.ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))))) {
    return NextResponse.json({ error: "Notificações inválidas." }, { status: 400 });
  }
  if (session.viewingAs) return NextResponse.json({ error: "Termine a supervisão para alterar notificações." }, { status: 403 });
  try { await markNotificationsRead(session.agent.id, body.ids); }
  catch { return NextResponse.json({ error: "Não foi possível guardar." }, { status: 503 }); }
  return NextResponse.json({ ok: true });
}
