"use client";

import { useState, type FormEvent } from "react";
import type { NewsComment } from "@/lib/db/news-comments";

export function ArticleComments({ articleId, comments, enabled }: { articleId: string; comments: NewsComment[]; enabled: boolean }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/news/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId, name: data.get("name"), email: data.get("email"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }) });
      if (!response.ok) throw new Error(response.status === 429 ? "Aguarde alguns minutos antes de enviar outro comentário." : "Não foi possível enviar. Reveja os campos e tente novamente.");
      form.reset(); setStatus("Obrigado. O comentário foi recebido e aparecerá depois da revisão editorial.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Ocorreu um erro."); }
    finally { setBusy(false); }
  }
  return <section id="comentarios" className="article-comments mt-12 border-t pt-8">
    <h2 className="font-display text-2xl text-[var(--hp-navy)]">Comentários</h2>
    {enabled ? <>
      <p className="mt-2 text-sm text-[var(--hp-text-2)]">Partilhe uma dúvida ou opinião. Os comentários são revistos antes de aparecerem nesta página. O seu email não é publicado.</p>
      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border bg-[var(--card)] p-5">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Nome<input required minLength={2} maxLength={80} name="name" autoComplete="name" className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label><label className="text-sm font-medium">Email (não publicado)<input required type="email" maxLength={254} name="email" autoComplete="email" className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label></div>
        <label className="text-sm font-medium">Comentário<textarea required minLength={10} maxLength={2000} name="message" rows={4} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <label className="flex items-start gap-2 text-xs text-[var(--hp-text-2)]"><input required type="checkbox" name="consent" className="mt-0.5" /><span>Autorizo a utilização do meu nome e comentário para publicação após revisão, e do meu email para gestão da participação, conforme a <a href="/privacidade" className="underline">política de privacidade</a>.</span></label>
        <div className="absolute -left-[10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <button disabled={busy} className="w-fit rounded-full bg-[var(--hp-red)] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "A enviar…" : "Enviar comentário"}</button>
        {status && <p role="status" className="text-sm">{status}</p>}
      </form>
    </> : <p className="mt-2 text-sm text-[var(--hp-text-2)]">Os comentários estão desativados neste artigo.</p>}
    {enabled && comments.length > 0 && <div className="mt-7 space-y-4">{comments.map(c => <div key={c.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{c.author_name}</strong><time className="text-[var(--hp-text-2)]" dateTime={c.created_at}>{new Date(c.created_at).toLocaleDateString("pt-PT")}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p></div>)}</div>}
  </section>;
}
