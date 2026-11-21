"use client";

import { useCallback, useEffect, useState } from "react";
import type { CommentSettings, PendingComment } from "@/lib/db/news-comments";

export function NewsCommentsBoard({ articles }: { articles: { id: string; title: string }[] }) {
  const [settings, setSettings] = useState<CommentSettings | null>(null);
  const [pending, setPending] = useState<PendingComment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/news/comments", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar a moderação.");
    const data = await response.json(); setSettings(data.settings); setPending(data.pending);
  }, []);
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);
  async function update(patch: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/news/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!response.ok) throw new Error("Não foi possível guardar. Tente novamente.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
    <h2 className="font-display text-xl">Comentários das notícias</h2>
    <p className="mt-1 text-sm text-muted-foreground">Só os comentários aprovados aparecem no website. O email do leitor fica reservado à administração.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {settings && <>
      <label className="mt-5 flex items-center gap-3 font-medium"><input type="checkbox" checked={settings.enabled} disabled={busy} onChange={e => update({ enabled: e.target.checked })} /> Permitir comentários no Guia HousePro</label>
      <details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer font-medium">Ativar ou desativar por artigo</summary>
        <div className="mt-4 max-h-64 space-y-2 overflow-auto">{articles.map(a => <label key={a.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!settings.disabled_article_ids.includes(a.id)} disabled={busy} onChange={e => update({ articleId: a.id, articleEnabled: e.target.checked })} /><span>{a.title}</span></label>)}</div>
      </details>
    </>}
    <h3 className="mt-6 font-semibold">Por rever ({pending.length})</h3>
    <div className="mt-3 space-y-3">{pending.map(c => <div key={c.id} className="rounded-xl border p-4 text-sm">
      <p className="font-semibold">{c.author_name} · {c.author_email}</p><p className="text-xs text-muted-foreground">{articles.find(a => a.id === c.article_id)?.title ?? c.article_id} · {new Date(c.created_at).toLocaleString("pt-PT")}</p>
      <p className="mt-2 whitespace-pre-wrap break-words">{c.body}</p>
      <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => update({ commentId: c.id, decision: "approved" })} className="rounded-full bg-primary px-4 py-2 text-white disabled:opacity-50">Aprovar</button><button disabled={busy} onClick={() => update({ commentId: c.id, decision: "rejected" })} className="rounded-full border px-4 py-2 disabled:opacity-50">Rejeitar</button></div>
    </div>)}{!pending.length && <p className="text-sm text-muted-foreground">Sem comentários pendentes.</p>}</div>
  </section>;
}
