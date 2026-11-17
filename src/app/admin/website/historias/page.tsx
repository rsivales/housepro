"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ImagePlus, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { UploadProgress, type UploadState } from "@/components/admin/upload-progress";
import { STORY_OPERATIONS, publishedStories, type Story, type StoryOperation } from "@/lib/data/stories";
import { writeStories, loadStoriesForEditor, uploadSiteImage, uploadErrorMessage, newId } from "@/lib/data/site-content";

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
  const latest = React.useRef<Story[]>([]);
  const revision = React.useRef(0);
  const [loaded, setLoaded] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = React.useState<Record<string, UploadState | undefined>>({});

  React.useEffect(() => {
    void loadStoriesForEditor().then((content) => {
      latest.current = content;
      setStories(latest.current);
      setLoaded(true);
    }).catch(() => setSaveState("error"));
  }, []);

  async function persist(next: Story[]) {
    const version = ++revision.current;
    latest.current = next;
    setStories(next);
    setSaveState("saving");
    const result = await writeStories(next);
    if (version === revision.current) setSaveState(result.persisted ? "saved" : "error");
    return result;
  }
  function patch(id: string, p: Partial<Story>) {
    void persist(latest.current.map((story) => {
      if (story.id !== id) return story;
      const updated = { ...story, ...p };
      if (!updated.publishedAt && !publishedStories([story]).length && publishedStories([updated]).length) {
        updated.publishedAt = new Date().toISOString().slice(0, 10);
      }
      return updated;
    }));
  }
  function add() {
    void persist([
      ...latest.current,
      { id: newId("hist"), name: "", quote: "", locality: "", operation: "Compra", published: false, consent: false },
    ]);
  }
  function remove(id: string) {
    void persist(latest.current.filter((s) => s.id !== id));
  }
  function move(index: number, direction: number) {
    const next = [...latest.current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  }
  async function onPoster(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    try {
      const url = await uploadSiteImage(f, "stories", (state) => setUploading((current) => ({ ...current, [id]: state })));
      const next = latest.current.map((story) => story.id === id ? {
        ...story, poster: url,
        publishedAt: story.publishedAt ?? (publishedStories([{ ...story, poster: url }]).length && !publishedStories([story]).length
          ? new Date().toISOString().slice(0, 10) : undefined),
      } : story);
      const result = await persist(next);
      if (!result.persisted) throw new Error(result.error ?? "save_failed");
      setUploading((current) => ({ ...current, [id]: { percent: 100, label: "✓ Fotografia carregada e publicada", tone: "success" } }));
    } catch (error) {
      setUploading((current) => ({ ...current, [id]: { percent: 100, label: uploadErrorMessage(error), tone: "error" } }));
    }
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
          <button disabled={!loaded} onClick={add} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Nova história
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-amber-700"><AlertTriangle className="size-4" /> Regra de conteúdo</p>
          Nunca inventar clientes, nomes, testemunhos ou fotografias. Uma história só aparece no site
          quando tiver identificação, testemunho, vídeo/fotografia, <strong>consentimento válido</strong> e
          estiver <strong>publicada</strong>. {saveState === "saving" && <span className="font-medium text-muted-foreground">A guardar…</span>}
          {saveState === "saved" && <span className="font-medium text-emerald-600">✓ Guardado no website</span>}
          {saveState === "error" && <span className="font-medium text-destructive">Não foi possível carregar ou guardar as histórias.</span>}
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
          {stories.map((s, index) => {
            const m = missing(s);
            const ready = m.length === 0;
            return (
              <div key={s.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ready ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                    {ready ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    {ready ? "Visível no site" : `Falta: ${m.join(", ")}`}
                  </span>
                  <div className="flex gap-2">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Subir ${s.name || "história"}`} className="rounded-md border p-2 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                  <button type="button" disabled={index === stories.length - 1} onClick={() => move(index, 1)} aria-label={`Descer ${s.name || "história"}`} className="rounded-md border p-2 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                  <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                    <Trash2 className="size-4" /> Remover
                  </button>
                  </div>
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
                  <label className="block">
                    <span className="text-sm font-medium">Data de publicação</span>
                    <input type="date" className={field} value={s.publishedAt ?? ""} onChange={(e) => patch(s.id, { publishedAt: e.target.value || undefined })} />
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
                    <input className={field} value={s.videoSrc ?? ""} onChange={(e) => patch(s.id, { videoSrc: e.target.value || undefined })} placeholder="Link do YouTube ou https://…/testemunho.mp4" />
                  </label>
                  <div className="sm:col-span-2">
                    <span className="text-sm font-medium">Fotografia / capa do vídeo</span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                        <ImagePlus className="size-4" /> {s.poster ? "Trocar" : "Carregar"}
                        <input type="file" accept="image/*" className="hidden" disabled={!!uploading[s.id] && uploading[s.id]?.tone === undefined} onChange={(e) => onPoster(s.id, e)} />
                      </label>
                      {s.poster && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.poster} alt="" className="h-14 w-24 rounded-md object-cover" />
                          <button onClick={() => patch(s.id, { poster: undefined })} className="text-xs text-muted-foreground hover:underline">Remover</button>
                        </>
                      )}
                      <UploadProgress state={uploading[s.id]} />
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
