import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { NewsCategory, NewsItem } from "@/lib/data/news";

const TINT_BY_CATEGORY: Record<NewsCategory, string> = {
  Mercado: "from-primary/15 to-primary/5",
  Legislação: "from-chart-3/15 to-chart-3/5",
  Investimento: "from-gold/20 to-gold/5",
  Dicas: "from-primary/12 to-gold/10",
  Eventos: "from-chart-4/15 to-chart-4/5",
  Internacional: "from-chart-4/15 to-chart-4/5",
};

interface NewsRow {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body: string[] | null;
  source: string;
  source_url: string | null;
  article_date: string;
  image: string | null;
  status: string;
  created_at: string;
}

function mapRow(r: NewsRow): NewsItem {
  const category = (r.category as NewsCategory) in TINT_BY_CATEGORY ? (r.category as NewsCategory) : "Mercado";
  return {
    id: r.id,
    category,
    title: r.title,
    excerpt: r.excerpt,
    source: r.source,
    date: r.article_date,
    url: r.source_url || "#",
    body: r.body ?? undefined,
    image: r.image ?? undefined,
    tint: TINT_BY_CATEGORY[category],
  };
}

/** Artigos reais aprovados (site público) — mais recentes primeiro. */
export async function listApprovedNews(limit?: number): Promise<NewsItem[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  let q = sb.from("news_articles").select("*").eq("status", "aprovado").order("article_date", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return ((data ?? []) as NewsRow[]).map(mapRow);
}

export async function getApprovedNewsById(id: string): Promise<NewsItem | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("news_articles").select("*").eq("id", id).eq("status", "aprovado").maybeSingle();
  return data ? mapRow(data as NewsRow) : null;
}

export interface PendingNewsItem extends NewsItem {
  createdAt: string;
}

/** Fila de revisão — artigos gerados automaticamente à espera de aprovação. */
export async function listPendingNews(): Promise<PendingNewsItem[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data } = await sb.from("news_articles").select("*").eq("status", "pendente").order("created_at", { ascending: false });
  return ((data ?? []) as NewsRow[]).map((r) => ({ ...mapRow(r), createdAt: r.created_at }));
}

/** Aprova (opcionalmente com imagem/título corrigidos) ou rejeita um artigo pendente. */
export async function decideNews(
  id: string,
  decision: "aprovado" | "rejeitado",
  decidedBy: string,
  patch?: { title?: string; excerpt?: string; image?: string }
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const dbPatch: Record<string, unknown> = {
    status: decision,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  };
  if (patch?.title) dbPatch.title = patch.title;
  if (patch?.excerpt) dbPatch.excerpt = patch.excerpt;
  if (patch?.image) dbPatch.image = patch.image;
  const { error } = await sb.from("news_articles").update(dbPatch).eq("id", id).eq("status", "pendente");
  if (error) return { error: error.message };
  return { ok: true };
}

export interface NewsDraft {
  category: NewsCategory;
  title: string;
  excerpt: string;
  body: string[];
  source: string;
  sourceUrl?: string;
  date?: string;
  image?: string;
}

/** Insere novos artigos como "pendente" — usado pela ingestão semanal. */
export async function ingestNewsDrafts(drafts: NewsDraft[]): Promise<{ inserted: number } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  if (drafts.length === 0) return { inserted: 0 };
  const sb = createAdminClient();
  const rows = drafts.map((d) => ({
    category: d.category,
    title: d.title,
    excerpt: d.excerpt,
    body: d.body,
    source: d.source,
    source_url: d.sourceUrl || null,
    article_date: d.date || new Date().toISOString().slice(0, 10),
    image: d.image || null,
    status: "pendente",
  }));
  const { error } = await sb.from("news_articles").insert(rows);
  if (error) return { error: error.message };
  return { inserted: rows.length };
}
