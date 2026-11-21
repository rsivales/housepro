import { NextRequest, NextResponse } from "next/server";
import { getNewsById, isExternalNews } from "@/lib/data/news";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCommentSettings } from "@/lib/db/news-comments";

export async function POST(request: NextRequest) {
  if (!hasServiceRole()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let input: { articleId?: string; name?: string; email?: string; message?: string; website?: string; consent?: boolean };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (input.website) return NextResponse.json({ ok: true }); // campo invisível para bots
  const articleId = String(input.articleId ?? "").trim();
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const body = String(input.message ?? "").trim();
  if (input.consent !== true || !/^[a-z0-9-]{1,120}$/.test(articleId) || name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || body.length < 10 || body.length > 2000) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const article = await getNewsById(articleId);
  const settings = await getCommentSettings();
  if (!article || isExternalNews(article) || !settings.enabled || settings.disabled_article_ids.includes(articleId)) {
    return NextResponse.json({ error: "comments_closed" }, { status: 403 });
  }
  const sb = createAdminClient();
  const { data: recent } = await sb.from("news_comments").select("id").eq("author_email", email)
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
  if (recent?.length) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const { error } = await sb.from("news_comments").insert({ article_id: articleId, author_name: name, author_email: email, body });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
