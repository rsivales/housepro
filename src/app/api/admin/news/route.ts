import { NextResponse } from "next/server";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listPendingNews, decideNews } from "@/lib/db/news";

/** Fila de revisão dos artigos gerados automaticamente (uma vez por semana).
 *  Nada publica no site sem passar por aqui. */
export async function GET() {
  const session = await getSession();
  if (!session || !isStaff(session.agent)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const items = await listPendingNews();
  return NextResponse.json({ ok: true, items });
}

/** PATCH { id, decision: "aprovado" | "rejeitado", title?, excerpt?, image? } */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !isStaff(session.agent)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { id?: string; decision?: string; title?: string; excerpt?: string; image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  const decision = body.decision;
  if (!id || (decision !== "aprovado" && decision !== "rejeitado")) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const res = await decideNews(id, decision, session.agent.id, {
    title: body.title,
    excerpt: body.excerpt,
    image: body.image,
  });
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
