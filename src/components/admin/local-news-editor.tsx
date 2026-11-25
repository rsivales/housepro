"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { AgencyNewsItem } from "@/lib/data/types";
export function LocalNewsEditor({ agencyId, readOnly }: { agencyId: string; readOnly: boolean }) {
  const [news, setNews] = useState<AgencyNewsItem[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { void fetch("/api/broker/local-news?agency=" + agencyId).then(r => r.json()).then(d => setNews(d.news ?? [])).catch(() => setMessage("Não foi possível carregar as notícias.")); }, [agencyId]);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget, fields = new FormData(form);
    try {
      const response = await fetch("/api/broker/local-news?agency=" + agencyId, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(fields)) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setNews(current => [payload.item, ...current]); form.reset(); setMessage("Notícia publicada na página local.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Erro ao publicar."); } finally { setBusy(false); }
  }
  async function queue(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "queue", agencyId, newsId: id }) });
      const data = await response.json(); setMessage(response.ok ? "Notícia colocada em fila. Atualize a página para ver a edição." : data.error);
    } catch { setMessage("Não foi possível colocar em fila."); } finally { setBusy(false); }
  }
  return <section className="rounded-2xl border bg-card p-5"><h2 className="font-display text-xl">Publicar notícia local</h2><p className="mt-1 text-sm text-muted-foreground">Escolha uma categoria e redija a notícia. Uma imagem pode ser indicada por URL HTTPS; não inclua dados pessoais sem autorização.</p>
    {!readOnly && <form onSubmit={publish} className="mt-5 grid gap-4"><label className="text-sm">Categoria<select name="category" required className="mt-1 block w-full rounded-lg border bg-background p-3">{["Comunidade", "Mercado local", "Recrutamento", "Tecnologia", "Projetos", "Agência"].map(c => <option key={c}>{c}</option>)}</select></label><label className="text-sm">Título<input name="title" minLength={8} maxLength={180} required className="mt-1 block w-full rounded-lg border bg-background p-3" /></label><label className="text-sm">Texto<textarea name="body" minLength={80} maxLength={12000} required rows={7} className="mt-1 block w-full rounded-lg border bg-background p-3" /></label><label className="text-sm">Imagem (URL HTTPS, opcional)<input name="image" type="url" placeholder="https://…" className="mt-1 block w-full rounded-lg border bg-background p-3" /></label><button disabled={busy} className="w-fit rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">Publicar na página da agência</button></form>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    <h3 className="mt-8 font-semibold">Publicadas</h3><div className="mt-3 space-y-3">{news.map(n => <article key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="text-xs text-muted-foreground">{n.category ?? "Agência"} · {new Date(n.date).toLocaleDateString("pt-PT")}</p><p className="font-semibold">{n.title}</p></div>{!readOnly && <button onClick={() => queue(n.id)} disabled={busy} className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50">Colocar na newsletter</button>}</article>)}{!news.length && <p className="text-sm text-muted-foreground">Ainda não há notícias locais.</p>}</div>
  </section>;
}
