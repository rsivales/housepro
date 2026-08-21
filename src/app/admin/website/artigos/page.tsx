"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, RotateCcw } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { getNews, newsImage, type NewsItem } from "@/lib/data/news";
import { readNewsImages, writeNewsImages, fileToDataUrl, type NewsImageMap } from "@/lib/data/site-content";

export default function ArtigosAdminPage() {
  const [articles, setArticles] = React.useState<NewsItem[]>([]);
  const [map, setMap] = React.useState<NewsImageMap>({});
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    getNews().then(setArticles);
    setMap(readNewsImages());
  }, []);

  function persist(next: NewsImageMap) {
    setMap(next);
    writeNewsImages(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  async function onImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    persist({ ...map, [id]: await fileToDataUrl(f) });
  }
  function reset(id: string) {
    const next = { ...map };
    delete next[id];
    persist(next);
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
          Define a imagem de destaque de cada artigo do Guia. Sem imagem definida, o site usa o
          fallback da categoria (nunca cinzento). {saved && <span className="font-medium text-emerald-600">✓ Guardado</span>}
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
                  <p className="text-xs text-muted-foreground">{map[a.id] ? "Imagem definida no admin" : "A usar fallback da categoria"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-secondary">
                    <ImagePlus className="size-4" /> {map[a.id] ? "Trocar" : "Carregar"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(a.id, e)} />
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
