import { NextResponse } from "next/server";

import { ingestNewsDrafts, type NewsDraft } from "@/lib/db/news";

/**
 * Ingestão semanal de artigos — chamada pela rotina agendada (Claude), não
 * por um consultor com sessão. Autenticada por chave partilhada
 * (ARTICLES_INGEST_SECRET), nunca por login: isto corre fora do browser.
 * Os artigos entram sempre como "pendente" — nunca saltam a revisão em
 * /admin/website/artigos.
 *
 * POST, header x-ingest-secret: <segredo>
 * body: { articles: NewsDraft[] }
 */
export async function POST(request: Request) {
  const secret = process.env.ARTICLES_INGEST_SECRET;
  if (!secret) return NextResponse.json({ error: "ingest_not_configured" }, { status: 501 });
  if (request.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { articles?: NewsDraft[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const articles = Array.isArray(body.articles) ? body.articles : [];
  const valid = articles.filter(
    (a) => a && typeof a.title === "string" && a.title.trim() && typeof a.excerpt === "string" && a.excerpt.trim()
  );
  if (valid.length === 0) return NextResponse.json({ error: "no_valid_articles" }, { status: 422 });

  const res = await ingestNewsDrafts(valid);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true, ...res });
}
