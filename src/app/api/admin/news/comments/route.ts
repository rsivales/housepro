import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCommentSettings, listPendingComments } from "@/lib/db/news-comments";

async function authorized() {
  const session = await getSession();
  return !!session && isSuperadmin(session.agent) && hasServiceRole() && !session.viewingAs;
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ settings: await getCommentSettings(), pending: await listPendingComments() });
}

export async function PATCH(request: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let input: { enabled?: boolean; articleId?: string; articleEnabled?: boolean; commentId?: string; decision?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const sb = createAdminClient();
  if (typeof input.enabled === "boolean") {
    const { error } = await sb.from("news_comment_settings").update({ enabled: input.enabled, updated_at: new Date().toISOString() }).eq("id", true);
    return NextResponse.json(error ? { error: "save_failed" } : { ok: true }, { status: error ? 503 : 200 });
  }
  if (input.articleId && typeof input.articleEnabled === "boolean" && /^[a-z0-9-]{1,120}$/.test(input.articleId)) {
    const settings = await getCommentSettings();
    const ids = new Set(settings.disabled_article_ids);
    if (input.articleEnabled) ids.delete(input.articleId); else ids.add(input.articleId);
    const { error } = await sb.from("news_comment_settings").update({ disabled_article_ids: [...ids], updated_at: new Date().toISOString() }).eq("id", true);
    return NextResponse.json(error ? { error: "save_failed" } : { ok: true }, { status: error ? 503 : 200 });
  }
  if (input.commentId && /^[a-f\d-]{36}$/.test(input.commentId) && (input.decision === "approved" || input.decision === "rejected")) {
    const { error } = await sb.from("news_comments").update({ status: input.decision, moderated_at: new Date().toISOString() }).eq("id", input.commentId).eq("status", "pending");
    return NextResponse.json(error ? { error: "save_failed" } : { ok: true }, { status: error ? 503 : 200 });
  }
  return NextResponse.json({ error: "invalid_body" }, { status: 400 });
}
