"use client";

import * as React from "react";
import { Check, ImagePlus, Loader2, Newspaper, X } from "lucide-react";

import { UploadProgress, type UploadState } from "@/components/admin/upload-progress";
import { uploadSiteImage, uploadErrorMessage } from "@/lib/data/site-content";
import { newsImage, type NewsItem } from "@/lib/data/news";

interface PendingItem extends NewsItem {
  createdAt: string;
}

/** Fila de revisão dos artigos gerados automaticamente (uma vez por semana) —
 *  nada chega ao site público sem passar por aqui: confirma o título/resumo,
 *  escolhe a foto, e só depois aprova ou rejeita. */
export function PendingNewsQueue() {
  const [items, setItems] = React.useState<PendingItem[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<Record<string, UploadState | undefined>>({});
  const [edits, setEdits] = React.useState<Record<string, { title?: string; excerpt?: string; image?: string }>>({});
  const [state, setState] = React.useState<"ok" | "forbidden" | "error">("ok");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/news");
      if (res.status === 403) { setState("forbidden"); return; }
      if (!res.ok) { setState("error"); return; }
      const j = await res.json();
      setItems(j.items ?? []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function onImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    try {
      const url = await uploadSiteImage(f, "articles", (st) => setUploading((c) => ({ ...c, [id]: st })));
      setEdits((c) => ({ ...c, [id]: { ...c[id], image: url } }));
      setUploading((c) => ({ ...c, [id]: { percent: 100, label: "✓ Imagem carregada", tone: "success" } }));
    } catch (error) {
      setUploading((c) => ({ ...c, [id]: { percent: 100, label: uploadErrorMessage(error), tone: "error" } }));
    }
  }

  async function decide(id: string, decision: "aprovado" | "rejeitado") {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision, ...edits[id] }),
      });
      if (res.ok) {
        setItems((all) => (all ?? []).filter((i) => i.id !== id));
      }
    } finally {
      setBusy(null);
    }
  }

  if (state === "forbidden" || state === "error") return null;
  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Newspaper className="size-5 text-primary" /> Artigos pendentes de revisão ({items.length})
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerados automaticamente — confirma o título, o resumo e a foto antes de aprovar. Nada publica sozinho.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((it) => {
          const edit = edits[it.id] ?? {};
          const shown = edit.image || newsImage(it);
          return (
            <div key={it.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shown} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{it.category} · {it.source}</p>
                  <input
                    value={edit.title ?? it.title}
                    onChange={(e) => setEdits((c) => ({ ...c, [it.id]: { ...c[it.id], title: e.target.value } }))}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm font-medium outline-none focus-visible:ring-[3px]"
                  />
                  <textarea
                    value={edit.excerpt ?? it.excerpt}
                    onChange={(e) => setEdits((c) => ({ ...c, [it.id]: { ...c[it.id], excerpt: e.target.value } }))}
                    rows={2}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs text-muted-foreground outline-none focus-visible:ring-[3px]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-secondary">
                      <ImagePlus className="size-4" /> Trocar foto
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(it.id, e)} />
                    </label>
                    <UploadProgress state={uploading[it.id]} />
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => decide(it.id, "rejeitado")}
                        disabled={busy === it.id}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Rejeitar
                      </button>
                      <button
                        onClick={() => decide(it.id, "aprovado")}
                        disabled={busy === it.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {busy === it.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Aprovar e publicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
