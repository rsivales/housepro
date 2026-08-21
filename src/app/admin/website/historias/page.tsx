"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ImagePlus, CheckCircle2, AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { STORY_OPERATIONS, publishedStories, type Story, type StoryOperation } from "@/lib/data/stories";
import { readStories, writeStories, fileToDataUrl, newId } from "@/lib/data/site-content";

const field = "mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Requisitos para uma história poder aparecer no site público. */
function missing(s: Story): string[] {
  const m: string[] = [];
  if (!s.name?.trim()) m.push("identificação");
  if (!s.quote?.trim()) m.push("testemunho");
  if (!s.videoSrc && !s.poster) m.push("vídeo ou fotografia");
  if (!s.consent) m.push("consentimento");
  if (!s.published) m.push("publicação");
  return m;
}

export default function HistoriasAdminPage() {
  const [stories, setStories] = React.useState<Story[]>([]);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setStories(readStories()), []);

  function persist(next: Story[]) {
    setStories(next);
    writeStories(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  function patch(id: string, p: Partial<Story>) {
    persist(stories.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }
  function add() {
    persist([
      ...stories,
      { id: newId("hist"), name: "", quote: "", locality: "", operation: "Compra", published: false, consent: false },
    ]);
  }
  function remove(id: string) {
    persist(stories.filter((s) => s.id !== id));
  }
  async function onPoster(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    patch(id, { poster: await fileToDataUrl(f) });
  }

  const liveCount = publishedStories(stories).length;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/admin/website" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Website público
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl">Histórias reais</h1>
          <button onClick={add} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Nova história
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-amber-700"><AlertTriangle className="size-4" /> Regra de conteúdo</p>
          Nunca inventar clientes, nomes, testemunhos ou fotografias. Uma história só aparece no site
          quando tiver identificação, testemunho, vídeo/fotografia, <strong>consentimento válido</strong> e
          estiver <strong>publicada</strong>. {saved && <span className="font-medium text-emerald-600">✓ Guardado</span>}
        </div>
        <p className="mt-3 text-sm">
          Visíveis no site agora: <strong>{liveCount}</strong> · em preparação: <strong>{stories.length - liveCount}</strong>
        </p>

        <div className="mt-6 space-y-5">
          {stories.length === 0 && (
            <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
              Ainda não há histórias. A secção fica oculta no site até existir uma história real, com consentimento e publicada.
            </p>
          )}
          {stories.map((s) => {
            const m = missing(s);
            const ready = m.length === 0;
            return (
              <div key={s.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ready ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                    {ready ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    {ready ? "Visível no site" : `Falta: ${m.join(", ")}`}
                  </span>
                  <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                    <Trash2 className="size-4" /> Remover
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Identificação autorizada</span>
                    <input className={field} value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} placeholder="Ex.: Ana e Miguel" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Localidade</span>
                    <input className={field} value={s.locality} onChange={(e) => patch(s.id, { locality: e.target.value })} placeholder="Faro" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium">Testemunho (verdadeiro)</span>
                    <input className={field} value={s.quote} onChange={(e) => patch(s.id, { quote: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Operação</span>
                    <select className={field} value={s.operation} onChange={(e) => patch(s.id, { operation: e.target.value as StoryOperation })}>
                      {STORY_OPERATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Vídeo (URL, opcional)</span>
                    <input className={field} value={s.videoSrc ?? ""} onChange={(e) => patch(s.id, { videoSrc: e.target.value || undefined })} placeholder="https://…/testemunho.mp4" />
                  </label>
                  <div className="sm:col-span-2">
                    <span className="text-sm font-medium">Fotografia / capa do vídeo</span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                        <ImagePlus className="size-4" /> {s.poster ? "Trocar" : "Carregar"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onPoster(s.id, e)} />
                      </label>
                      {s.poster && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.poster} alt="" className="h-14 w-24 rounded-md object-cover" />
                          <button onClick={() => patch(s.id, { poster: undefined })} className="text-xs text-muted-foreground hover:underline">Remover</button>
                        </>
                      )}
                    </div>
                  </div>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium">Transcrição (acessibilidade, opcional)</span>
                    <textarea className={field} rows={2} value={s.transcript ?? ""} onChange={(e) => patch(s.id, { transcript: e.target.value || undefined })} />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-primary" checked={!!s.consent} onChange={(e) => patch(s.id, { consent: e.target.checked })} />
                    Consentimento válido e autorização de uso no website (RGPD)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-primary" checked={!!s.published} onChange={(e) => patch(s.id, { published: e.target.checked })} />
                    Publicar no site
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
