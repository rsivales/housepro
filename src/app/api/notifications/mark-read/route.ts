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
  } catch {
    body = {};
  }

  await markNotificationsRead(session.agent.id, body.ids);
  return NextResponse.json({ ok: true });
}
