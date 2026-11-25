import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { createEmailList, listEmailLists } from "@/lib/db/repo";
import type { Segment } from "@/lib/data/xcampaigns";

/**
 * Listas de email guardadas (audiências reutilizáveis) — um segmento com
 * nome, para escolher diretamente ao compor uma campanha.
 *  GET  → listas do próprio.
 *  POST → cria uma lista a partir do segmento atual.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const lists = await listEmailLists(session.agent.id);
  return NextResponse.json({ lists });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let body: { name?: string; segment?: Segment };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Falta o nome da lista." }, { status: 400 });

  const list = await createEmailList({ ownerId: session.agent.id, name, segment: body.segment ?? {} });
  if (!list) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ list });
}
