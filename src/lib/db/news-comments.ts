import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export type NewsComment = { id: string; article_id: string; author_name: string; body: string; created_at: string };
export type PendingComment = NewsComment & { author_email: string; status: string };
export type CommentSettings = { enabled: boolean; disabled_article_ids: string[] };

export async function getCommentSettings(): Promise<CommentSettings> {
  if (!hasServiceRole()) return { enabled: false, disabled_article_ids: [] };
  const { data, error } = await createAdminClient().from("news_comment_settings").select("enabled,disabled_article_ids").eq("id", true).single();
  if (error || !data) return { enabled: false, disabled_article_ids: [] };
  return data as CommentSettings;
}

export async function listArticleComments(articleId: string): Promise<NewsComment[]> {
  if (!hasServiceRole()) return [];
  const { data } = await createAdminClient().from("news_comments").select("id,article_id,author_name,body,created_at")
    .eq("article_id", articleId).eq("status", "approved").order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as NewsComment[];
}

export async function listPendingComments(): Promise<PendingComment[]> {
  if (!hasServiceRole()) return [];
  const { data } = await createAdminClient().from("news_comments").select("id,article_id,author_name,author_email,body,status,created_at")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(200);
  return (data ?? []) as PendingComment[];
}
