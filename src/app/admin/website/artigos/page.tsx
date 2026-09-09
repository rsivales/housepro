"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, RotateCcw } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { UploadProgress, type UploadState } from "@/components/admin/upload-progress";
import { getNews, newsImage, type NewsItem } from "@/lib/data/news";
import { readNewsImages, writeNewsImages, loadSiteContent, uploadSiteImage, uploadErrorMessage, type NewsImageMap } from "@/lib/data/site-content";

export default function ArtigosAdminPage() {
  const [articles, setArticles] = React.useState<NewsItem[]>([]);
  const [map, setMap] = React.useState<NewsImageMap>({});
  const [uploading, setUploading] = React.useState<Record<string, UploadState | undefined>>({});

  React.useEffect(() => {
    getNews().then(setArticles);
    loadSiteContent(true).then((content) => setMap(content.newsimg ?? readNewsImages()));
  }, []);

  async function persist(next: NewsImageMap) {
    setMap(next);
    return writeNewsImages(next);
  }
  async function onImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    try {
      const url = await uploadSiteImage(f, "articles", (state) => setUploading((current) => ({ ...current, [id]: state })));
      const result = await persist({ ...map, [id]: url });
      if (!result.persisted) throw new Error(result.error ?? "save_failed");
      setUploading((current) => ({ ...current, [id]: { percent: 100, label: "✓ Imagem carregada e publicada", tone: "success" } }));
    } catch (error) {
      setUploading((current) => ({ ...current, [id]: { percent: 100, label: uploadErrorMessage(error), tone: "error" } }));
    }
  }
  function reset(id: string) {
    const next = { ...map };
    delete next[id];
    void persist(next);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/admin/website" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Website público
        </Link>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl">Imagens de artigos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cada artigo tem sempre uma imagem: primeiro a capa escolhida aqui, depois a imagem da fonte e,
          como proteção final, uma fotografia profissional da respetiva categoria.
        </p>

        <div className="mt-6 space-y-3">
          {articles.map((a) => {
            const shown = map[a.id] || newsImage(a);
            return (
              <div key={a.id} className="flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shown} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{a.category}</p>
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{map[a.id] ? "Imagem própria publicada" : a.image ? "Imagem recebida da fonte" : "Imagem profissional da categoria"}</p>
                  <UploadProgress state={uploading[a.id]} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-secondary">
                    <ImagePlus className="size-4" /> {map[a.id] ? "Trocar" : "Carregar"}
                    <input type="file" accept="image/*" className="hidden" disabled={!!uploading[a.id] && uploading[a.id]?.tone === undefined} onChange={(e) => onImage(a.id, e)} />
                  </label>
                  {map[a.id] && (
                    <button onClick={() => reset(a.id)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                      <RotateCcw className="size-4" /> Repor
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
